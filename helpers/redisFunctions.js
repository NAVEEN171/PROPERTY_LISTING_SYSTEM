const { connectRedis } = require("../config/Redis");

const DEFAULT_EXPIRY = 1800;

const setKey = async (key, value, expiry = DEFAULT_EXPIRY) => {
  try {
    const client = await connectRedis();
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);

    await client.setEx(key, expiry, stringValue);
    return true;
  } catch (error) {
    console.error(`Redis setKey error for key "${key}":`, error);
    return false;
  }
};

const getKey = async (key) => {
  try {
    const client = await connectRedis();
    const value = await client.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (parseError) {
      return value;
    }
  } catch (error) {
    console.error(`Redis getKey error for key "${key}":`, error);
    return null;
  }
};

const deleteKey = async (key) => {
  try {
    const client = await connectRedis();
    const result = await client.del(key);

    if (result > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(`Redis deleteKey error for key "${key}":`, error);
    return false;
  }
};

const deleteKeysByPattern = async (pattern) => {
  try {
    const client = await connectRedis();
    const keys = await client.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    const result = await client.del(keys);
    return result;
  } catch (error) {
    console.error(
      `Redis deleteKeysByPattern error for pattern "${pattern}":`,
      error
    );
    return 0;
  }
};

const keyExists = async (key) => {
  try {
    const client = await connectRedis();
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`Redis keyExists error for key "${key}":`, error);
    return false;
  }
};

const setExpiry = async (key, expiry) => {
  try {
    const client = await connectRedis();
    const result = await client.expire(key, expiry);

    if (result === 1) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(`Redis setExpiry error for key "${key}":`, error);
    return false;
  }
};

module.exports = {
  setKey,
  getKey,
  deleteKey,
  deleteKeysByPattern,
  keyExists,
  setExpiry,
  DEFAULT_EXPIRY,
};
