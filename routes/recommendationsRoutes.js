const express = require("express");
const router = express.Router();
const {
  searchUsers,
  recommendProperty,
  getReceivedRecommendations,
} = require("../controllers/recommendationsControllers");
const authenticateToken = require("../middleware/auth");

router.get("/search-users", authenticateToken, searchUsers);

router.post("/recommend-property", authenticateToken, recommendProperty);

router.get("/", authenticateToken, getReceivedRecommendations);

module.exports = router;
