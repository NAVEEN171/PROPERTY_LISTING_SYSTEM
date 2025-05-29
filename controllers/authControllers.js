const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const connectDB = require("../config/DB");
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, ACCESS_TOKEN_SECRET, {
    expiresIn: "30m",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, REFRESH_TOKEN_SECRET, {
    expiresIn: "1d",
  });
};

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    } else if (password.length < 8) {
      return res.status(400).json({
        message: "Password must have a length of 8 characters",
      });
    } else if (!email.includes("@")) {
      return res.status(400).json({
        message: "Enter a valid email ,include @",
      });
    }
    const db = await connectDB();
    const usersCollection = db.collection("Users");

    const existingUser = await usersCollection.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      return res.status(409).json({
        message: "User already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    };

    const result = await usersCollection.insertOne(newUser);

    const accessToken = generateAccessToken({
      email: newUser.email,
      id: result.insertedId,
    });
    const refreshToken = generateRefreshToken({
      email: newUser.email,
      id: result.insertedId,
    });

    const userResponse = {
      id: result.insertedId,
      name: newUser.name,
      email: newUser.email,
    };

    res.status(201).json({
      message: "User created successfully",
      user: userResponse,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }
    const db = await connectDB();
    const usersCollection = db.collection("Users");

    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const accessToken = generateAccessToken({
      id: user._id,
      email: user.email,
    });
    const refreshToken = generateRefreshToken({
      id: user._id,
      email: user.email,
    });

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    res.status(200).json({
      message: "Login successful",
      user: userResponse,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const refreshToken = authHeader && authHeader.split(" ")[1];

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    const db = await connectDB();
    const usersCollection = db.collection("Users");

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, user) => {
        if (err) {
          if (err.name === "TokenExpiredError") {
            return res.status(401).json({
              message: "Refresh token has expired. Please login again.",
              code: "REFRESH_TOKEN_EXPIRED",
            });
          }

          return res.status(403).json({
            message: "Invalid refresh token",
            code: "REFRESH_TOKEN_INVALID",
          });
        }

        const existingUser = await usersCollection.findOne({
          email: user.email,
        });

        if (!existingUser) {
          return res.status(403).json({ message: "User not found" });
        }

        // Generate new tokens
        const accessToken = generateAccessToken({
          id: existingUser._id,
          email: existingUser.email,
        });

        const userResponse = {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
        };

        res.status(200).json({
          success: true,
          message: "Token refreshed successfully",
          accessToken,
          user: userResponse,
        });
      }
    );
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(500).json({ message: "Server error during token refresh" });
  }
};

module.exports = {
  signup,
  login,
  refreshToken,
};
