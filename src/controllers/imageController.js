const asyncHandler = require("../utils/asyncHandler");

const imageService = require("../services/imageService");
const imageProcessingService = require("../services/imageProcessingService");

const ApiError = require("../errors/ApiError");

/**
 * @desc Upload image
 * @route POST /api/images
 * @access Private
 */
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No image uploaded.");
  }

  const image = await imageService.createImageFromUpload(req.file, req.user.id);

  res.status(201).json({
    success: true,
    message: "Image uploaded successfully.",
    image,
  });
});

/**
 * @desc Transform image
 * @route POST /api/images/:id/transform
 * @access Private
 */
const transformUploadedImage = asyncHandler(async (req, res) => {
  // Get the image and verify ownership
  const image = await imageService.getUserImage(req.params.id, req.user.id);

  // Apply transformations
  const transformed = await imageProcessingService.transformImage(
    image.path,
    req.body,
  );

  // Determine the original image ID
  const originalImageId = image.isOriginal ? image._id : image.originalImage;

  // Check cache first
  const existing = await imageService.findExistingTransformedImage(
    originalImageId,
    transformed.hash,
  );

  if (existing) {
    return res.status(200).json({
      success: true,
      message: "Cached transformed image returned.",
      image: existing,
    });
  }

  // Save transformed image metadata safely
  const savedImage = await imageService.createTransformedImageIfNotExists({
    originalImageId,
    transformHash: transformed.hash,

    imageData: {
      owner: image.owner,

      originalName: image.originalName,

      filename: transformed.filename,

      path: transformed.path,

      mimetype: transformed.mimetype,

      size: transformed.size,

      width: transformed.width,

      height: transformed.height,

      transformationParams: req.body,
    },
  });

  res.status(201).json({
    success: true,
    message: "Image transformed successfully.",
    image: savedImage,
  });
});

/**
 * @desc Get all user images
 * @route GET /api/images
 * @access Private
 */
const getUserImages = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);

  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

  const result = await imageService.getUserImages(req.user.id, page, limit);

  res.status(200).json({
    success: true,

    pagination: {
      totalImages: result.totalImages,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      limit: result.limit,
    },

    images: result.images,
  });
});

/**
 * @desc Get image by ID
 * @route GET /api/images/:id
 * @access Private
 */
const getImageById = asyncHandler(async (req, res) => {
  const image = await imageService.getUserImage(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    image,
  });
});

/**
 * @desc Delete image
 * @route DELETE /api/images/:id
 * @access Private
 */
const deleteImage = asyncHandler(async (req, res) => {
  await imageService.deleteUserImage(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: "Image deleted successfully.",
  });
});

module.exports = {
  uploadImage,
  transformUploadedImage,
  getUserImages,
  getImageById,
  deleteImage,
};
