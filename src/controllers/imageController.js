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
  if (Object.keys(req.body).length === 0) {
    throw new ApiError(400, "No transformations provided.");
  }

  const image = await imageService.getUserImage(req.params.id, req.user.id);

  const transformed = await imageProcessingService.transformImage(
    image.path,
    req.body,
  );

  const savedImage = await imageService.createImage({
    owner: image.owner,
    originalName: image.originalName,
    filename: transformed.filename,
    path: transformed.path,
    mimetype: transformed.mimetype,
    size: transformed.size,
    width: transformed.width,
    height: transformed.height,
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
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

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
