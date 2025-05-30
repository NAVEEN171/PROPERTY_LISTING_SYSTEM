const {
  getFilteredProperties,
  createProperty,
  getProperty,
  updateProperty,
  deleteProperty,
} = require("../controllers/propertiesControllers");
const authenticateToken = require("../middleware/auth");
const express = require("express");
const router = express.Router();

router.get("/Get-properties", authenticateToken, getFilteredProperties);
router.post("/add-property", authenticateToken, createProperty);

router.get("/get-property/:propertyId", authenticateToken, getProperty);

router.put("/update-property/:propertyId", authenticateToken, updateProperty);

router.delete(
  "/delete-property/:propertyId",
  authenticateToken,
  deleteProperty
);

module.exports = router;
