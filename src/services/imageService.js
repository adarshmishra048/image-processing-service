const fs = require("fs/promises");
const sharp = require("sharp");

const Image = require("../models/Image");
const ApiError = require("../errors/ApiError");

/**
 * Create an image document
 */
const createImage = async (imageData) => {
  return await Image.create(imageData);
};

/**
 * Create an image document from an uploaded file
 */
const createImageFromUpload = async (file, userId) => {
  const metadata = await sharp(file.path).metadata();

  return await Image.create({
    owner: userId,
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    mimetype: file.mimetype,
    size: file.size,
    width: metadata.width,
    height: metadata.height,
  });
};

/**
 * Find image by ID
 */
const findImageById = async (imageId) => {
  return await Image.findById(imageId);
};

/**
 * Get an image and verify ownership
 */
const getUserImage = async (imageId, userId) => {
  const image = await Image.findById(imageId);

  if (!image) {
    throw new ApiError(404, "Image not found.");
  }

  if (image.owner.toString() !== userId) {
    throw new ApiError(403, "Access denied.");
  }

  return image;
};

/**
 * Get paginated images for a user
 */
const getUserImages = async (userId, page = 1, limit = 10) => {
  page = Math.max(Number(page), 1);
  limit = Math.min(Math.max(Number(limit), 1), 100);

  const skip = (page - 1) * limit;

  const totalImages = await Image.countDocuments({
    owner: userId,
  });

  const images = await Image.find({
    owner: userId,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    totalImages,
    currentPage: page,
    totalPages: Math.ceil(totalImages / limit),
    limit,
    images,
  };
};

/**
 * Delete an image (database + file)
 */
const deleteUserImage = async (imageId, userId) => {
  const image = await getUserImage(imageId, userId);

  try {
    await fs.unlink(image.path);
  } catch (error) {
    console.warn("Image file not found:", image.path);
  }

  await image.deleteOne();

  return image;
};

module.exports = {
  createImage,
  createImageFromUpload,
  findImageById,
  getUserImage,
  getUserImages,
  deleteUserImage,
};
