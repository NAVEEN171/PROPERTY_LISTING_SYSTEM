const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const connectDB = require("../config/DB");
const { format } = require("date-fns");
const mongoose = require("mongoose");
const { ObjectId } = require("mongoose").Types;
const {
  setKey,
  getKey,
  deleteKey,
  deleteKeysByPattern,
} = require("../helpers/redisFunctions");

const getCacheKey = {
  filteredProperties: (queryParams) => {
    const sortedParams = Object.keys(queryParams)
      .sort()
      .map((key) => `${key}:${queryParams[key]}`)
      .join("|");
    return `properties:filtered:${Buffer.from(sortedParams).toString(
      "base64"
    )}`;
  },
  singleProperty: (propertyId) => `property:${propertyId}`,
  allPropertiesPattern: () => `properties:*`,
  singlePropertyPattern: (propertyId) => `property:${propertyId}*`,
};

const getFilteredProperties = async (req, res) => {
  try {
    const cacheKey = getCacheKey.filteredProperties(req.query);

    const cachedProperties = await getKey(cacheKey);
    if (cachedProperties) {
      return res.status(200).json(cachedProperties);
    }

    const db = await connectDB();
    const propertiesCollection = db.collection("Properties");

    const {
      areaSqFtFrom,
      areaSqFtTo,
      title,
      propertyTypes,
      states,
      priceFrom,
      priceTo,
      rating,
      cities,
      bedRooms,
      bathRooms,
      listedBy,
      listingType,
      colorThemes,
      furnishedTypes,
      isVerified,
      tags,
      amenities,
      availableFrom,
      Page,
      sortBy,
      sortOrder,
    } = req.query;

    const match = {};
    const aggregationPipeline = [];
    const PROPERTIES_PER_PAGE = 10;
    const page = parseInt(Page) || 1;

    if (availableFrom) {
      const startDate = format(availableFrom, "yyyy-MM-dd");
      match.availableFrom = { $gte: startDate };
    }

    try {
      if (
        isVerified &&
        typeof JSON.parse(isVerified.toLowerCase()) === "boolean"
      ) {
        match.isVerified = { $eq: isVerified };
      }
    } catch (err) {
      console.log("not a boolean");
    }

    let propertyTypesArray;
    if (propertyTypes) {
      propertyTypesArray = propertyTypes.split(",");

      match.type = { $in: propertyTypesArray };
    }

    let furnishedTypesArray;
    if (furnishedTypes) {
      furnishedTypesArray = furnishedTypes.split(",");

      match.furnished = { $in: furnishedTypesArray };
    }

    let colorThemesArray;
    if (colorThemes) {
      colorThemesArray = colorThemes.split(",");

      match.colorTheme = { $in: colorThemesArray };
    }

    if (listingType) {
      match.listingType = { $eq: listingType };
    }

    let listedByArray;
    if (listedBy) {
      listedByArray = listedBy.split(",");

      match.listedBy = { $in: listedByArray };
    }

    let citiesArray;
    if (cities) {
      citiesArray = cities.split(",");

      match.city = { $in: citiesArray };
    }

    if (bathRooms) {
      const bathRoomCount = parseInt(bathRooms);
      if (!isNaN(bathRoomCount)) {
        match.bathrooms = { $eq: parseInt(bathRooms) };
      }
    }

    if (bedRooms) {
      const bedRoomCount = parseInt(bedRooms);
      if (!isNaN(bedRoomCount)) {
        match.bedrooms = bedRoomCount;
      }
    }

    let tagsArray;
    if (tags) {
      tagsArray = tags.split(",");

      aggregationPipeline.unshift({
        $addFields: {
          tagsArray: {
            $map: {
              input: { $split: ["$tags", "|"] },
              as: "tag",
              in: { $trim: { input: "$$tag" } },
            },
          },
        },
      });

      match.tagsArray = { $all: tagsArray };
    }

    let amenitiesArray;
    if (amenities) {
      amenitiesArray = amenities.split(",");

      aggregationPipeline.unshift({
        $addFields: {
          amenitiesArray: {
            $map: {
              input: { $split: ["$amenities", "|"] },
              as: "amenity",
              in: { $trim: { input: "$$amenity" } },
            },
          },
        },
      });

      match.amenitiesArray = { $all: amenitiesArray };
    }

    if (rating) {
      match.rating = { $gte: parseFloat(rating) };
    }

    let statesArray;
    if (states) {
      statesArray = states.split(",");

      match.state = { $in: statesArray };
    }

    if (priceFrom && priceTo) {
      match.price = {
        $gte: parseInt(priceFrom),
        $lte: parseInt(priceTo),
      };
    } else if (priceFrom) {
      match.price = { $gte: parseInt(priceFrom) };
    } else if (priceTo) {
      match.price = { $lte: parseInt(priceTo) };
    }

    if (areaSqFtFrom && areaSqFtTo) {
      match.areaSqFt = {
        $gte: parseInt(areaSqFtFrom),
        $lte: parseInt(areaSqFtTo),
      };
    } else if (areaSqFtFrom) {
      match.areaSqFt = { $gte: parseInt(areaSqFtFrom) };
    } else if (areaSqFtTo) {
      match.areaSqFt = { $lte: parseInt(areaSqFtTo) };
    }

    if (title) {
      match.title = { $regex: title, $options: "i" };
    }

    if (Object.keys(match).length > 0) {
      aggregationPipeline.push({ $match: match });
    }

    const sortOptions = {};
    if (sortBy) {
      switch (sortBy) {
        case "priceLowToHigh":
          sortOptions.price = sortOrder === "asc" ? 1 : -1;
          break;
        case "rating":
          sortOptions.rating = sortOrder === "asc" ? 1 : -1;
          break;
        case "area":
          sortOptions.areaSqFt = sortOrder === "asc" ? 1 : -1;
          break;
        default:
          sortOptions.availableFrom = 1;
      }
    } else {
      sortOptions.availableFrom = 1;
    }

    aggregationPipeline.push({ $sort: sortOptions });

    if (Page) {
      aggregationPipeline.push({
        $facet: {
          totalCount: [{ $count: "count" }],
          paginatedProperties: [
            { $skip: (page - 1) * PROPERTIES_PER_PAGE },
            { $limit: PROPERTIES_PER_PAGE },
          ],
        },
      });

      aggregationPipeline.push({
        $project: {
          totalCount: { $arrayElemAt: ["$totalCount.count", 0] },
          paginatedProperties: 1,
        },
      });
    }

    const filteredProperties = await propertiesCollection
      .aggregate(aggregationPipeline)
      .toArray();

    let responseData;
    if (filteredProperties.length > 0) {
      let maxPages = filteredProperties[0].totalCount;
      let fullPages = Math.floor(maxPages / PROPERTIES_PER_PAGE);
      if (maxPages % PROPERTIES_PER_PAGE > 0) {
        fullPages = fullPages + 1;
      }
      responseData = {
        properties: filteredProperties[0].paginatedProperties || [],
        maxPaginatedPages: fullPages,
      };
    } else {
      responseData = {
        properties: filteredProperties,
        maxPaginatedPages: 0,
      };
    }

    await setKey(cacheKey, responseData);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error filtering properties:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const createProperty = async (req, res) => {
  try {
    const db = await connectDB();
    const propertiesCollection = db.collection("Properties");

    const {
      id,
      title,
      type,
      price,
      state,
      city,
      areaSqFt,
      bedrooms,
      bathrooms,
      amenities,
      furnished,
      availableFrom,
      listedBy,
      tags,
      colorTheme,
      rating,
      listingType,
    } = req.body;

    const requiredFields = [
      "id",
      "title",
      "type",
      "price",
      "state",
      "city",
      "areaSqFt",
      "bedrooms",
      "bathrooms",
      "furnished",
      "availableFrom",
      "listedBy",
      "listingType",
    ];

    for (let field of requiredFields) {
      if (
        req.body[field] === undefined ||
        req.body[field] === null ||
        req.body[field] === ""
      ) {
        return res.status(400).json({
          message: `${field} is required`,
        });
      }
    }

    const validTypes = ["Apartment", "Villa", "Bungalow", "Plot", "Studio"];
    const validFurnished = ["Furnished", "Semi", "Unfurnished"];
    const validListedBy = ["Owner", "Agent", "Builder"];
    const validListingType = ["sale", "rent"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message:
          "Invalid property type. Must be one of: Apartment, Villa, Bungalow, Plot, Studio",
      });
    }

    if (!validFurnished.includes(furnished)) {
      return res.status(400).json({
        message:
          "Invalid furnished type. Must be one of: Furnished, Semi, Unfurnished",
      });
    }

    if (!validListedBy.includes(listedBy)) {
      return res.status(400).json({
        message: "Invalid listedBy type. Must be one of: Owner, Agent, Builder",
      });
    }

    if (!validListingType.includes(listingType)) {
      return res.status(400).json({
        message: "Invalid listingType. Must be one of: sale, rent",
      });
    }

    if (price <= 0 || areaSqFt <= 0 || bedrooms < 0 || bathrooms < 0) {
      return res.status(400).json({
        message:
          "Price and areaSqFt must be positive, bedrooms and bathrooms cannot be negative",
      });
    }

    if (rating !== undefined && (rating < 0 || rating > 5)) {
      return res.status(400).json({
        message: "Rating must be between 0 and 5",
      });
    }

    let availableDate;
    try {
      availableDate = format(new Date(availableFrom), "yyyy-MM-dd");
    } catch (error) {
      return res.status(400).json({
        message: "Invalid availableFrom date format",
      });
    }

    const existingProperty = await propertiesCollection.findOne({ id });
    if (existingProperty) {
      return res.status(400).json({
        message: "Property with this ID already exists",
      });
    }

    let amenitiesValue = "";
    if (amenities) {
      amenitiesValue = amenities.replace(/,/g, "|");
    }

    let tagsValue = "";
    if (tags) {
      tagsValue = tags.replace(/,/g, "|");
    }

    const newProperty = {
      id,
      title,
      type,
      price: Number(price),
      state,
      city,
      areaSqFt: Number(areaSqFt),
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      amenities: amenitiesValue,
      furnished,
      availableFrom: availableDate,
      listedBy,
      tags: tagsValue,
      colorTheme: colorTheme || "#ffffff",
      rating: rating ? Number(rating) : undefined,
      isVerified: false,
      listingType,
      createdBy: new ObjectId(String(req.user.id)),
    };

    Object.keys(newProperty).forEach((key) => {
      if (newProperty[key] === undefined) {
        delete newProperty[key];
      }
    });

    const result = await propertiesCollection.insertOne(newProperty);

    if (result.acknowledged) {
      await deleteKeysByPattern(getCacheKey.allPropertiesPattern());

      res.status(201).json({
        message: "Property created successfully",
        data: { ...newProperty, _id: result.insertedId },
      });
    }
  } catch (error) {
    console.error("Create property error:", error);
    res.status(500).json({
      message: "Error creating property",
      error: error.message,
    });
  }
};

const getProperty = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Property ID is required",
      });
    }

    const cacheKey = getCacheKey.singleProperty(id);

    const cachedProperty = await getKey(cacheKey);
    if (cachedProperty) {
      return res.status(200).json({
        data: cachedProperty,
      });
    }

    const db = await connectDB();
    const propertiesCollection = db.collection("Properties");

    const property = await propertiesCollection.findOne({ id });

    if (!property) {
      return res.status(404).json({
        message: "Property not found",
      });
    }

    await setKey(cacheKey, property);

    res.status(200).json({
      data: property,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching property",
      error: error.message,
    });
  }
};

const updateProperty = async (req, res) => {
  try {
    const db = await connectDB();
    const propertiesCollection = db.collection("Properties");

    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Property ID is required",
      });
    }

    const property = await propertiesCollection.findOne({ id });

    if (!property) {
      return res.status(404).json({
        message: "Property not found",
      });
    }

    if (property.createdBy.toHexString() !== req.user.id) {
      return res.status(403).json({
        message:
          "You are not authorized to update this property. Only the creator can update it.",
      });
    }

    // Validate updates if they exist
    if (
      updates.type &&
      !["Apartment", "Villa", "Bungalow", "Plot", "Studio"].includes(
        updates.type
      )
    ) {
      return res.status(400).json({
        message: "Invalid property type",
      });
    }

    if (
      updates.furnished &&
      !["Furnished", "Semi", "Unfurnished"].includes(updates.furnished)
    ) {
      return res.status(400).json({
        message: "Invalid furnished type",
      });
    }

    if (
      updates.listedBy &&
      !["Owner", "Agent", "Builder"].includes(updates.listedBy)
    ) {
      return res.status(400).json({
        message: "Invalid listedBy type",
      });
    }

    if (
      updates.listingType &&
      !["sale", "rent"].includes(updates.listingType)
    ) {
      return res.status(400).json({
        message: "Invalid listingType",
      });
    }

    if (
      updates.rating !== undefined &&
      (updates.rating < 0 || updates.rating > 5)
    ) {
      return res.status(400).json({
        message: "Rating must be between 0 and 5",
      });
    }

    if (updates.price !== undefined && updates.price <= 0) {
      return res.status(400).json({
        message: "Price must be positive",
      });
    }

    if (updates.areaSqFt !== undefined && updates.areaSqFt <= 0) {
      return res.status(400).json({
        message: "Area must be positive",
      });
    }

    if (updates.availableFrom) {
      try {
        updates.availableFrom = format(
          new Date(updates.availableFrom),
          "yyyy-MM-dd"
        );
      } catch (error) {
        return res.status(400).json({
          message: "Invalid availableFrom date",
        });
      }
    }

    if (updates.amenities) {
      updates.amenities = updates.amenities.replace(/,/g, "|");
    }

    if (updates.tags) {
      updates.tags = updates.tags.replace(/,/g, "|");
    }

    delete updates.id;
    delete updates.createdBy;
    delete updates._id;

    updates.updatedAt = new Date();

    const result = await propertiesCollection.updateOne(
      { id },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Property not found",
      });
    }

    const updatedProperty = await propertiesCollection.findOne({ id });

    const singlePropertyKey = getCacheKey.singleProperty(id);
    await deleteKey(singlePropertyKey);
    await deleteKeysByPattern(getCacheKey.allPropertiesPattern());

    res.status(200).json({
      message: "Property updated successfully",
      data: updatedProperty,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating property",
      error: error.message,
    });
  }
};

// DELETE Property - Using Native MongoDB
const deleteProperty = async (req, res) => {
  try {
    const db = await connectDB();
    const propertiesCollection = db.collection("Properties");

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Property ID is required",
      });
    }

    const property = await propertiesCollection.findOne({ id });

    if (!property) {
      return res.status(404).json({
        message: "Property not found",
      });
    }

    if (property.createdBy.toHexString() !== req.user.id) {
      return res.status(403).json({
        message:
          "You are not authorized to delete this property. Only the creator can delete it.",
      });
    }

    const result = await propertiesCollection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Property not found or already deleted",
      });
    }

    const singlePropertyKey = getCacheKey.singleProperty(id);
    await deleteKey(singlePropertyKey);
    await deleteKeysByPattern(getCacheKey.allPropertiesPattern());

    res.status(200).json({
      message: "Property deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting property",
      error: error.message,
    });
  }
};

module.exports = {
  getFilteredProperties,
  createProperty,
  getProperty,
  updateProperty,
  deleteProperty,
};
