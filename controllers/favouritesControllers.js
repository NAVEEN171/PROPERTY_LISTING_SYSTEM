const { ObjectId } = require("mongodb");
const connectDB = require("../config/DB");
const { setKey, getKey, deleteKey } = require("../helpers/redisFunctions");

const getCacheKey = {
  userFavourites: (userId) => `favourites:user:${userId}`,
  singleFavourite: (userId, favouriteId) =>
    `favourite:${userId}:${favouriteId}`,
  userFavouritePattern: (userId) => `favourite:${userId}:*`,
};

const createFavourite = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.id;

    if (!propertyId) {
      return res.status(400).json({
        message: "PropertyId is required",
      });
    }

    const db = await connectDB();
    const favouritesCollection = db.collection("Favourites");

    const existingFavourite = await favouritesCollection.findOne({
      userId: new ObjectId(String(userId)),
      propertyId: propertyId,
    });

    if (existingFavourite) {
      return res.status(409).json({
        message: "Property already in favourites",
      });
    }

    const newFavourite = {
      userId: new ObjectId(String(userId)),
      propertyId: propertyId, // String as requested
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await favouritesCollection.insertOne(newFavourite);

    // Clear cache after creating new favourite
    const userFavouritesKey = getCacheKey.userFavourites(userId);
    await deleteKey(userFavouritesKey);

    res.status(201).json({
      message: "Added to favourites successfully",
      favourite: {
        id: result.insertedId,
        userId: userId,
        propertyId: propertyId,
        createdAt: newFavourite.createdAt,
        updatedAt: newFavourite.updatedAt,
      },
    });
  } catch (error) {
    console.error("Create favourite error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getFavourites = async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = getCacheKey.userFavourites(userId);

    const cachedFavourites = await getKey(cacheKey);
    if (cachedFavourites) {
      return res.status(200).json({
        message: "Favourites retrieved successfully (from cache)",
        count: cachedFavourites.count,
        favourites: cachedFavourites.favourites,
      });
    }

    console.log(`Cache miss for user favourites: ${cacheKey}`);

    // Get from database
    const db = await connectDB();
    const favouritesCollection = db.collection("Favourites");

    const favourites = await favouritesCollection
      .find({ userId: new ObjectId(String(userId)) })
      .sort({ createdAt: -1 })
      .toArray();

    const responseData = {
      count: favourites.length,
      favourites: favourites.map((fav) => ({
        id: fav._id,
        userId: fav.userId,
        propertyId: fav.propertyId,
        createdAt: fav.createdAt,
        updatedAt: fav.updatedAt,
      })),
    };

    await setKey(cacheKey, responseData);

    res.status(200).json({
      message: "Favourites retrieved successfully",
      ...responseData,
    });
  } catch (error) {
    console.error("Get favourites error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// READ - Get single favourite by ID (WITH CACHING)
const getFavouriteById = async (req, res) => {
  try {
    const { id } = req.params; // favourite _id
    const userId = req.user.id; // From auth middleware

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid favourite ID",
      });
    }

    const cacheKey = getCacheKey.singleFavourite(userId, id);

    const cachedFavourite = await getKey(cacheKey);
    if (cachedFavourite) {
      return res.status(200).json({
        message: "Favourite retrieved successfully (from cache)",
        favourite: cachedFavourite,
      });
    }

    // Get from database
    const db = await connectDB();
    const favouritesCollection = db.collection("Favourites");

    const favourite = await favouritesCollection.findOne({
      _id: new ObjectId(String(id)),
      userId: new ObjectId(String(userId)), // Ensure user can only access their own favourites
    });

    if (!favourite) {
      return res.status(404).json({
        message: "Favourite not found",
      });
    }

    const favouriteData = {
      id: favourite._id,
      userId: favourite.userId,
      propertyId: favourite.propertyId,
      createdAt: favourite.createdAt,
      updatedAt: favourite.updatedAt,
    };

    // Cache the result
    await setKey(cacheKey, favouriteData);

    res.status(200).json({
      message: "Favourite retrieved successfully",
      favourite: favouriteData,
    });
  } catch (error) {
    console.error("Get favourite by ID error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateFavourite = async (req, res) => {
  try {
    const { id } = req.params;
    const { propertyId } = req.body;
    const userId = req.user.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid favourite ID",
      });
    }

    if (!propertyId) {
      return res.status(400).json({
        message: "PropertyId is required",
      });
    }

    const db = await connectDB();
    const favouritesCollection = db.collection("Favourites");

    const existingFavourite = await favouritesCollection.findOne({
      _id: new ObjectId(String(id)),
      userId: new ObjectId(String(userId)),
    });

    if (!existingFavourite) {
      return res.status(404).json({
        message: "Favourite not found",
      });
    }

    const updateData = {
      propertyId: propertyId,
      updatedAt: new Date(),
    };

    const result = await favouritesCollection.updateOne(
      { _id: new ObjectId(String(id)), userId: new ObjectId(String(userId)) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Favourite not found",
      });
    }

    const userFavouritesKey = getCacheKey.userFavourites(userId);
    const singleFavouriteKey = getCacheKey.singleFavourite(userId, id);

    await deleteKey(userFavouritesKey);
    await deleteKey(singleFavouriteKey);

    res.status(200).json({
      message: "Favourite updated successfully",
      favourite: {
        id: id,
        userId: userId,
        propertyId: propertyId,
        createdAt: existingFavourite.createdAt,
        updatedAt: updateData.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update favourite error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const deleteFavourite = async (req, res) => {
  try {
    const { id } = req.params; // favourite _id
    const userId = req.user.id; // From auth middleware

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid favourite ID",
      });
    }

    const db = await connectDB();
    const favouritesCollection = db.collection("Favourites");

    const result = await favouritesCollection.deleteOne({
      _id: new ObjectId(String(id)),
      userId: new ObjectId(String(userId)), // Ensure user can only delete their own favourites
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Favourite not found",
      });
    }

    const userFavouritesKey = getCacheKey.userFavourites(userId);
    const singleFavouriteKey = getCacheKey.singleFavourite(userId, id);

    await deleteKey(userFavouritesKey);
    await deleteKey(singleFavouriteKey);

    res.status(200).json({
      message: "Favourite removed successfully",
    });
  } catch (error) {
    console.error("Delete favourite error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createFavourite,
  getFavourites,
  getFavouriteById,
  updateFavourite,
  deleteFavourite,
};
