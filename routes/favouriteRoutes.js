const express = require("express");
const router = express.Router();
const {
  createFavourite,
  getFavourites,
  getFavouriteById,
  updateFavourite,
  deleteFavourite,
} = require("../controllers/favouritesControllers");
const authenticateToken = require("../middleware/auth");

router.post("/add-favourite/:propertyId", authenticateToken, createFavourite);

router.get("/", authenticateToken, getFavourites);

router.get("/get-favourite/:id", authenticateToken, getFavouriteById);

router.put("/update-favourite/:id", authenticateToken, updateFavourite);

router.delete("/delete-favourite/:id", authenticateToken, deleteFavourite);

module.exports = router;
