const connectDB = require("../config/DB");
const { ObjectId } = require("mongodb");
const {
  setKey,
  getKey,
  deleteKey,
  deleteKeysByPattern,
} = require("../helpers/redisFunctions");

const searchUsers = async (req, res) => {
  try {
    const { searchEmail } = req.query;

    if (!searchEmail) {
      return res.status(400).json({
        success: false,
        message: "Search word is required",
      });
    }

    const cacheKey = `search_users:${searchEmail.toLowerCase()}`;

    const cachedUsers = await getKey(cacheKey);
    if (cachedUsers) {
      return res.status(200).json({
        users: cachedUsers,
      });
    }

    const db = await connectDB();
    const usersCollection = db.collection("Users");

    const searchRegex = new RegExp(searchEmail, "i");

    const users = await usersCollection
      .find({
        email: { $regex: searchRegex },
      })
      .project({ name: 1, email: 1 })
      .limit(15)
      .toArray();

    await setKey(cacheKey, users, 600);
    console.log(`Cached search results for: ${searchEmail}`);

    res.status(200).json({
      users: users,
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const recommendProperty = async (req, res) => {
  try {
    const { email, featureId } = req.body;
    const recommendingUserId = req.user.id;

    if (!email || !featureId) {
      return res.status(400).json({
        message: "Email and featureId are required",
      });
    }

    const db = await connectDB();
    const usersCollection = db.collection("Users");
    const recommendationsCollection = db.collection("Recommendations");

    const recommendingUser = await usersCollection.findOne({
      _id: new ObjectId(String(recommendingUserId)),
    });

    if (!recommendingUser) {
      return res.status(404).json({
        message: "Recommending user not found",
      });
    }

    if (recommendingUser.email.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({
        message: "You cannot recommend a property to yourself",
      });
    }

    const recipientUser = await usersCollection.findOne({
      email: email.toLowerCase(),
    });

    if (!recipientUser) {
      return res.status(404).json({
        message: "User not found with this email",
      });
    }

    const existingRecommendation = await recommendationsCollection.findOne({
      userId: new ObjectId(String(recommendingUserId)),
      recommendedToUserId: new ObjectId(recipientUser._id),
      featureId: featureId,
    });

    if (existingRecommendation) {
      return res.status(409).json({
        message: "You have already recommended this property to this user",
      });
    }

    const recommendation = {
      userId: new ObjectId(String(recommendingUserId)),
      recommendedToUserId: new ObjectId(String(recipientUser._id)),
      featureId: featureId,
      createdAt: new Date(),
      status: "pending",
    };

    const result = await recommendationsCollection.insertOne(recommendation);

    const recommendingUserCacheKey = `recommendations:${recommendingUserId}`;
    const recipientUserCacheKey = `recommendations:${recipientUser._id}`;

    await deleteKey(recommendingUserCacheKey);
    await deleteKey(recipientUserCacheKey);

    const cacheKey = `recommendations:${recommendingUserId}`;

    res.status(201).json({
      recommendationId: result.insertedId,
      recommendedTo: {
        name: recipientUser.name,
        email: recipientUser.email,
      },
    });
  } catch (error) {
    console.error("Recommend property error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getReceivedRecommendations = async (req, res) => {
  try {
    const userId = new ObjectId(String(req.user.id));
    const cacheKey = `recommendations:${userId}`;

    const cachedRecommendations = await getKey(cacheKey);
    if (cachedRecommendations) {
      return res.status(200).json(cachedRecommendations);
    }

    const db = await connectDB();
    const recommendationsCollection = db.collection("Recommendations");
    const usersCollection = db.collection("Users");

    const allRecommendations = await recommendationsCollection
      .find({
        $or: [{ userId: userId }, { recommendedToUserId: userId }],
      })
      .sort({ createdAt: -1 })
      .toArray();

    const receivedRecommendations = [];
    const sentRecommendations = [];

    for (const rec of allRecommendations) {
      if (rec.recommendedToUserId.equals(userId)) {
        const recommender = await usersCollection.findOne(
          { _id: rec.userId },
          { projection: { name: 1, email: 1 } }
        );

        receivedRecommendations.push({
          id: rec._id,
          featureId: rec.featureId,
          recommendedBy: recommender,
          createdAt: rec.createdAt,
          status: rec.status,
          type: "received",
        });
      } else {
        const recipient = await usersCollection.findOne(
          { _id: rec.recommendedToUserId },
          { projection: { name: 1, email: 1 } }
        );

        sentRecommendations.push({
          id: rec._id,
          featureId: rec.featureId,
          recommendedTo: recipient,
          createdAt: rec.createdAt,
          status: rec.status,
          type: "sent",
        });
      }
    }

    const responseData = {
      message: "Recommendations retrieved successfully",
      received: receivedRecommendations,
      sent: sentRecommendations,
      totalReceived: receivedRecommendations.length,
      totalSent: sentRecommendations.length,
    };

    await setKey(cacheKey, responseData, 900);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Get received recommendations error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  searchUsers,
  recommendProperty,
  getReceivedRecommendations,
};
