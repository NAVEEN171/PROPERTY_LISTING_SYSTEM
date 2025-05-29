const { createClient } = require("redis");
require("dotenv").config();

let redisClient = null;

const connectRedis = async () => {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      username: "default",
      password: process.env.REDIS_CONN_PASSWORD,
      socket: {
        host: "redis-10375.c325.us-east-1-4.ec2.redns.redis-cloud.com",
        port: 10375,
      },
    });

    redisClient.on("error", (err) => {
      console.log("Redis Client Error:", err);
    });

    await redisClient.connect();
    console.log("Successfully connected to Redis");

    return redisClient;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    throw error;
  }
};

module.exports = { connectRedis, redisClient };
