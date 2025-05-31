const connectDB = require("../config/DB");

const createPropertiesIndexes = async () => {
  try {
    console.log("Starting to create indexes for Properties collection...");

    const db = await connectDB();
    const propertiesCollection = db.collection("Properties");

    const singleIndexes = [
      { listingType: 1 },
      { type: 1 },
      { city: 1 },
      { state: 1 },
      { price: 1 },
      { areaSqFt: 1 },
      { bedrooms: 1 },
      { bathrooms: 1 },
      { rating: 1 },
      { isVerified: 1 },
      { availableFrom: 1 },
      { furnished: 1 },
      { listedBy: 1 },
      { colorTheme: 1 },
    ];

    for (const index of singleIndexes) {
      try {
        const result = await propertiesCollection.createIndex(index);
        console.log(` Created index: ${JSON.stringify(index)} - ${result}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(
            ` Error creating index ${JSON.stringify(index)}:`,
            error.message
          );
        }
      }
    }

    const compoundIndexes = [
      { listingType: 1, city: 1, price: 1 },
      { type: 1, bedrooms: 1, bathrooms: 1 },
      { state: 1, city: 1 },
    ];

    for (const index of compoundIndexes) {
      try {
        const result = await propertiesCollection.createIndex(index);
        console.log(
          ` Created compound index: ${JSON.stringify(index)} - ${result}`
        );
      } catch (error) {
        if (error.code === 85) {
          console.log(
            `  Compound index already exists: ${JSON.stringify(index)}`
          );
        } else {
          console.error(
            ` Error creating compound index ${JSON.stringify(index)}:`,
            error.message
          );
        }
      }
    }

    try {
      const textIndexResult = await propertiesCollection.createIndex({
        title: "text",
      });
      console.log(` Created text index on title - ${textIndexResult}`);
    } catch (error) {
      if (error.code === 85) {
        console.log(`  Text index on title already exists`);
      } else {
        console.error(` Error creating text index on title:`, error.message);
      }
    }

    const indexes = await propertiesCollection.indexes();
    console.log("\n All indexes on Properties collection:");
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log("\n Index creation process completed successfully!");

    return {
      success: true,
      message: "All indexes created successfully",
      totalIndexes: indexes.length,
    };
  } catch (error) {
    console.error(" Error in createPropertiesIndexes:", error);
    return {
      success: false,
      message: error.message,
      error: error,
    };
  }
};

module.exports = createPropertiesIndexes;
