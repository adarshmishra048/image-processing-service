const express = require("express");

const validate = require("../middleware/validate");
const { transformSchema } = require("../validators/imageValidator");

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../config/multer");
const { transformLimiter } = require("../config/security");

const {
  uploadImage,
  previewImage,
  transformUploadedImage,
  getUserImages,
  getImageById,
  deleteImage,
} = require("../controllers/imageController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Images
 *   description: Image management and transformation
 */

/**
 * @swagger
 * /api/images:
 *   post:
 *     summary: Upload an image
 *     tags: [Images]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *       400:
 *         description: Invalid file
 *       401:
 *         description: Unauthorized
 */
router.post("/", authMiddleware, upload.single("image"), uploadImage);

/**
 * @swagger
 * /api/images:
 *   get:
 *     summary: Get paginated user images
 *     tags: [Images]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 10
 *     responses:
 *       200:
 *         description: List of images
 *       401:
 *         description: Unauthorized
 */
router.get("/", authMiddleware, getUserImages);

/**
 * @swagger
 * /api/images/{id}:
 *   get:
 *     summary: Get image by ID
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Image not found
 */
router.get("/:id", authMiddleware, getImageById);

/**
 * @swagger
 * /api/images/{id}/preview:
 *   get:
 *     summary: Preview transformed image without saving
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: width
 *         schema:
 *           type: integer
 *       - in: query
 *         name: height
 *         schema:
 *           type: integer
 *       - in: query
 *         name: rotate
 *         schema:
 *           type: integer
 *       - in: query
 *         name: grayscale
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sepia
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: blur
 *         schema:
 *           type: number
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Preview image
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Image not found
 */
router.get("/:id/preview", authMiddleware, previewImage);

/**
 * @swagger
 * /api/images/{id}/transform:
 *   post:
 *     summary: Apply transformations to an image
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resize:
 *                 type: object
 *                 properties:
 *                   width:
 *                     type: integer
 *                     example: 300
 *                   height:
 *                     type: integer
 *                     example: 300
 *               rotate:
 *                 type: integer
 *                 example: 90
 *               grayscale:
 *                 type: boolean
 *                 example: true
 *               sepia:
 *                 type: boolean
 *                 example: false
 *               blur:
 *                 type: number
 *                 example: 1
 *               format:
 *                 type: string
 *                 example: webp
 *     responses:
 *       201:
 *         description: Image transformed successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Image not found
 */
router.post(
  "/:id/transform",
  authMiddleware,
  transformLimiter,
  validate(transformSchema),
  transformUploadedImage,
);

/**
 * @swagger
 * /api/images/{id}:
 *   delete:
 *     summary: Delete an image
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Image not found
 */
router.delete("/:id", authMiddleware, deleteImage);

module.exports = router;
