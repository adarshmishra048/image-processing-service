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
  if (!file) {
    throw new ApiError(400, "Image file is required.");
  }

  let metadata;

  try {
    metadata = await sharp(file.path).metadata();
  } catch (error) {
    throw new ApiError(400, "Invalid or corrupted image file.");
  }

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

  if (String(image.owner) !== String(userId)) {
    throw new ApiError(403, "Access denied.");
  }

  return image;
};

/**
 * Get paginated images for a user
 */
const getUserImages = async (userId, page = 1, limit = 10) => {
  page = Number(page);
  limit = Number(limit);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = 10;

  limit = Math.min(limit, 100);

  const skip = (page - 1) * limit;

  const filter = { owner: userId };

  const [totalImages, images] = await Promise.all([
    Image.countDocuments(filter),
    Image.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    totalImages,
    currentPage: page,
    totalPages: Math.ceil(totalImages / limit),
    limit,
    images,
  };
};

/**
 * Find an existing transformed image by original image + hash
 */
const findExistingTransformedImage = async (originalImageId, transformHash) => {
  return await Image.findOne({
    originalImage: originalImageId,
    transformHash,
  });
};

/**
 * Create a transformed image only if it does not already exist
 */
const createTransformedImageIfNotExists = async ({
  originalImageId,
  transformHash,
  imageData,
}) => {
  const existing = await findExistingTransformedImage(
    originalImageId,
    transformHash,
  );

  if (existing) {
    return existing;
  }

  return await Image.create({
    ...imageData,
    originalImage: originalImageId,
    transformHash,
    isOriginal: false,
  });
};

/**
 * Delete an image (database + file)
 */
const deleteUserImage = async (imageId, userId) => {
  const image = await getUserImage(imageId, userId);

  // Delete transformed variants if this is an original image
  if (image.isOriginal) {
    const variants = await Image.find({
      originalImage: image._id,
    }).lean();

    await Promise.all(
      variants.map(async (variant) => {
        try {
          await fs.unlink(variant.path);
        } catch {
          // Ignore missing files
        }

        await Image.deleteOne({ _id: variant._id });
      }),
    );
  }

  // Delete main file
  try {
    await fs.unlink(image.path);
  } catch {
    // Ignore missing files
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
  findExistingTransformedImage,
  createTransformedImageIfNotExists,
  deleteUserImage,
};
