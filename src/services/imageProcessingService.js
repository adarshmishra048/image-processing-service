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

  return image.resize({
    width: Number(resize.width),
    height: Number(resize.height),
    fit: resize.fit || "cover",
    withoutEnlargement: true,
  });
};

// ------------------------------
// Crop
// ------------------------------
const applyCrop = (image, crop) => {
  if (!crop) return image;

  return image.extract({
    left: Number(crop.x),
    top: Number(crop.y),
    width: Number(crop.width),
    height: Number(crop.height),
  });
};

// ------------------------------
// Rotate
// ------------------------------
const applyRotate = (image, angle) => {
  if (angle === undefined) return image;

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
  if (!blur) return image;

  return image.blur(typeof blur === "number" ? blur : undefined);
};

const applySharpen = (image, sharpen) =>
  sharpen ? image.sharpen() : image;

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
// Stable transformation hash
// ------------------------------
const createTransformHash = (transformations) => {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(transformations))
    .digest("hex")
    .slice(0, 12);
};

// ------------------------------
// Build filename
// ------------------------------
const buildFilename = (inputPath, transformations, extension) => {
  const baseName = path.basename(inputPath, path.extname(inputPath));

  const hash = createTransformHash(transformations);

  const finalExt =
    extension || path.extname(inputPath).replace(".", "");

  return `${baseName}-${hash}.${finalExt}`;
};

// ------------------------------
// Main transform function
// ------------------------------
const transformImage = async (inputPath, transformations) => {
  // Ensure input exists
  try {
    await fs.access(inputPath);
  } catch {
    throw new ApiError(404, "Source image not found.");
  }

  let image = sharp(inputPath);

  // Apply transformations
  image = applyResize(image, transformations.resize);
  image = applyCrop(image, transformations.crop);
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
    transformations.format
  );

  // Generate deterministic filename
  const filename = buildFilename(inputPath, transformations, extension);

  const outputDir = path.join("uploads", "transformed");
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
    path: outputPath,
    mimetype: `image/${metadata.format}`,
    size: stats.size,
    width: metadata.width,
    height: metadata.height,
    hash: createTransformHash(transformations),
  };
};

module.exports = {
  transformImage,
};