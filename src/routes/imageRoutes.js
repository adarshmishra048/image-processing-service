const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../config/multer");

const {
  uploadImage,
  transformUploadedImage,
  getUserImages,
  getImageById,
  deleteImage,
} = require("../controllers/imageController");

const router = express.Router();

/**
 * ==========================
 * Image Routes
 * Base URL: /api/images
 * ==========================
 */

/**
 * Upload Image
 * POST /api/images
 */
router.post("/", authMiddleware, upload.single("image"), uploadImage);

/**
 * Get All Images
 * GET /api/images?page=1&limit=10
 */
router.get("/", authMiddleware, getUserImages);

/**
 * Get Single Image
 * GET /api/images/:id
 */
router.get("/:id", authMiddleware, getImageById);

/**
 * Transform Image
 * POST /api/images/:id/transform
 */
router.post("/:id/transform", authMiddleware, transformUploadedImage);

/**
 * Delete Image
 */
router.delete("/:id", authMiddleware, deleteImage);

module.exports = router;
