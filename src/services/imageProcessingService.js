const sharp = require("sharp");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
const ApiError = require("../errors/ApiError");

// ------------------------------
// Sharp production limits
// ------------------------------
sharp.cache(false); // Reduce memory usage
sharp.concurrency(2); // Safer on small VPS instances

// ------------------------------
// Resize
// ------------------------------
const applyResize = (image, resize) => {
  if (!resize) return image;

  const width = Number(resize.width);
  const height = Number(resize.height);

  return image.resize({
    width: Number.isFinite(width) && width > 0 ? width : null,
    height: Number.isFinite(height) && height > 0 ? height : null,
    fit: resize.fit || "cover",
    withoutEnlargement: false,
  });
};

// ------------------------------
// Crop
// ------------------------------
const applyCrop = async (image, crop) => {
  if (!crop) return image;

  const left = Number(crop.x);
  const top = Number(crop.y);
  const width = Number(crop.width);
  const height = Number(crop.height);

  if (![left, top, width, height].every(Number.isFinite)) {
    throw new ApiError(400, "Invalid crop parameters.");
  }

  const metadata = await image.metadata();

  if (
    left < 0 ||
    top < 0 ||
    width <= 0 ||
    height <= 0 ||
    left + width > metadata.width ||
    top + height > metadata.height
  ) {
    throw new ApiError(
      400,
      "Invalid crop parameters: Crop area is out of image bounds.",
    );
  }

  return image.extract({
    left,
    top,
    width,
    height,
  });
};

// ------------------------------
// Rotate
// ------------------------------
const applyRotate = (image, angle) => {
  if (angle === undefined || angle === null) return image;

  return image.rotate(Number(angle));
};

// ------------------------------
// Flip / Mirror
// ------------------------------
const applyFlip = (image, flip) => (flip ? image.flip() : image);

const applyMirror = (image, mirror) => (mirror ? image.flop() : image);

// ------------------------------
// Grayscale
// ------------------------------
const applyGrayscale = (image, grayscale) =>
  grayscale ? image.grayscale() : image;

// ------------------------------
// Sepia
// ------------------------------
const applySepia = (image, sepia) => {
  if (!sepia) return image;

  return image.recomb([
    [0.393, 0.769, 0.189],
    [0.349, 0.686, 0.168],
    [0.272, 0.534, 0.131],
  ]);
};

// ------------------------------
// Blur / Sharpen
// ------------------------------
const applyBlur = (image, blur) => {
  if (blur === undefined || blur === null || blur === false) return image;

  return image.blur(typeof blur === "number" ? blur : undefined);
};

const applySharpen = (image, sharpen) => (sharpen ? image.sharpen() : image);

// ------------------------------
// Format
// ------------------------------
const applyFormat = (image, format) => {
  if (!format) {
    return {
      image,
      extension: null,
    };
  }

  const ext = format.toLowerCase();

  switch (ext) {
    case "png":
      image.png({ compressionLevel: 9 });
      break;

    case "jpg":
    case "jpeg":
      image.jpeg({
        quality: 85,
        mozjpeg: true,
      });
      break;

    case "webp":
      image.webp({
        quality: 85,
      });
      break;

    default:
      throw new ApiError(400, "Unsupported image format.");
  }

  return {
    image,
    extension: ext,
  };
};

// ------------------------------
// Deterministic object sorting
// ------------------------------
const sortObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }

  if (obj && typeof obj === "object") {
    return Object.keys(obj)
      .filter((key) => obj[key] !== undefined)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObject(obj[key]);
        return acc;
      }, {});
  }

  return obj;
};

// ------------------------------
// Stable transformation hash
// ------------------------------
const createTransformHash = (transformations = {}) => {
  const normalized = JSON.stringify(sortObject(transformations));

  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex")
    .slice(0, 16);
};

// ------------------------------
// Build filename
// ------------------------------
const buildFilename = (inputPath, hash, extension) => {
  const baseName = path.basename(inputPath, path.extname(inputPath));

  const finalExt = extension || path.extname(inputPath).replace(".", "");

  return `${baseName}-${hash}.${finalExt}`;
};

// ------------------------------
// Main transform function
// ------------------------------
const transformImage = async (inputPath, transformations = {}) => {
  // Ensure input exists
  try {
    await fs.access(inputPath);
  } catch {
    throw new ApiError(404, "Source image not found.");
  }

  const hash = createTransformHash(transformations);

  let image = sharp(inputPath);

  // Apply transformations
  image = applyResize(image, transformations.resize);
  image = await applyCrop(image, transformations.crop);
  image = applyRotate(image, transformations.rotate);
  image = applyFlip(image, transformations.flip);
  image = applyMirror(image, transformations.mirror);
  image = applyGrayscale(image, transformations.grayscale);
  image = applySepia(image, transformations.sepia);
  image = applyBlur(image, transformations.blur);
  image = applySharpen(image, transformations.sharpen);

  // Apply output format
  const { image: processedImage, extension } = applyFormat(
    image,
    transformations.format,
  );

  // Generate deterministic filename
  const filename = buildFilename(inputPath, hash, extension);

  const outputDir = path.resolve("uploads/transformed");
  await fs.mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, filename);

  // Avoid regenerating existing variants
  try {
    await fs.access(outputPath);
  } catch {
    await processedImage.toFile(outputPath);
  }

  // Read metadata
  const metadata = await sharp(outputPath).metadata();
  const stats = await fs.stat(outputPath);

  return {
    filename,
    path: path.join("uploads", "transformed", filename),
    mimetype: `image/${metadata.format === "jpeg" ? "jpeg" : metadata.format}`,
    size: stats.size,
    width: metadata.width,
    height: metadata.height,
    hash,
  };
};

// ------------------------------
// Preview buffer (no file saved)
// ------------------------------
const previewImageBuffer = async (inputPath, transformations = {}) => {
  let image = sharp(inputPath);

  image = applyResize(image, transformations.resize);
  image = await applyCrop(image, transformations.crop);
  image = applyRotate(image, transformations.rotate);
  image = applyFlip(image, transformations.flip);
  image = applyMirror(image, transformations.mirror);
  image = applyGrayscale(image, transformations.grayscale);
  image = applySepia(image, transformations.sepia);
  image = applyBlur(image, transformations.blur);
  image = applySharpen(image, transformations.sharpen);

  const { image: processedImage, extension } = applyFormat(
    image,
    transformations.format,
  );

  const buffer = await processedImage.toBuffer();

  return {
    buffer,
    mimetype: `image/${extension || "jpeg"}`,
  };
};

module.exports = {
  transformImage,
  previewImageBuffer,
};
