const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  refreshToken,
  checkPosts,
} = require("../controllers/authControllers");

router.post("/signup", signup);

router.post("/login", login);

router.post("/refresh-token", refreshToken);

module.exports = router;
