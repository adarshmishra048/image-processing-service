const sharp = require("sharp");
const path = require("path");
const fs = require("fs/promises");
const ApiError = require("../errors/ApiError");

/**
 * Apply resize transformation
 */
const applyResize = (image, resize) => {
  if (!resize) return image;

  return image.resize(Number(resize.width), Number(resize.height));
};

/**
 * Apply crop transformation
 */
const applyCrop = (image, crop) => {
  if (!crop) return image;

  return image.extract({
    left: Number(crop.x),
    top: Number(crop.y),
    width: Number(crop.width),
    height: Number(crop.height),
  });
};

/**
 * Apply rotation
 */
const applyRotate = (image, angle) => {
  if (angle === undefined) return image;

  return image.rotate(Number(angle));
};

/**
 * Apply flip
 */
const applyFlip = (image, flip) => {
  if (!flip) return image;

  return image.flip();
};

/**
 * Apply mirror (horizontal flip)
 */
const applyMirror = (image, mirror) => {
  if (!mirror) return image;

  return image.flop();
};

/**
 * Apply grayscale
 */
const applyGrayscale = (image, grayscale) => {
  if (!grayscale) return image;

  return image.grayscale();
};

/**
 * Apply sepia
 */
const applySepia = (image, sepia) => {
  if (!sepia) return image;

  return image.recomb([
    [0.393, 0.769, 0.189],
    [0.349, 0.686, 0.168],
    [0.272, 0.534, 0.131],
  ]);
};

/**
 * Apply blur
 */
const applyBlur = (image, blur) => {
  if (!blur) return image;

  return image.blur(typeof blur === "number" ? blur : undefined);
};

/**
 * Apply sharpen
 */
const applySharpen = (image, sharpen) => {
  if (!sharpen) return image;

  return image.sharpen();
};

/**
 * Apply output format
 */
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
      image.png();
      break;

    case "jpg":
    case "jpeg":
      image.jpeg();
      break;

    case "webp":
      image.webp();
      break;

    default:
      throw new ApiError(400, "Unsupported image format.");
  }

  return {
    image,
    extension: ext,
  };
};

/**
 * Build transformed filename
 */
const buildFilename = (inputPath, transformations, extension) => {
  const baseName = path.basename(inputPath, path.extname(inputPath));

  let suffix = "";

  if (transformations.resize) {
    suffix += `-${transformations.resize.width}x${transformations.resize.height}`;
  }

  if (transformations.crop) {
    suffix += "-crop";
  }

  if (transformations.rotate) {
    suffix += `-r${transformations.rotate}`;
  }

  if (transformations.flip) {
    suffix += "-flip";
  }

  if (transformations.mirror) {
    suffix += "-mirror";
  }

  if (transformations.grayscale) {
    suffix += "-gray";
  }

  if (transformations.sepia) {
    suffix += "-sepia";
  }

  if (transformations.blur) {
    suffix += "-blur";
  }

  if (transformations.sharpen) {
    suffix += "-sharp";
  }

  if (extension) {
    suffix += `-${extension}`;
  }

  return `${baseName}${suffix}.${extension || path.extname(inputPath).slice(1)}`;
};

/**
 * Main transformation function
 */
const transformImage = async (inputPath, transformations) => {
  let image = sharp(inputPath);

  image = applyResize(image, transformations.resize);
  image = applyCrop(image, transformations.crop);
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

  const filename = buildFilename(inputPath, transformations, extension);

  const outputPath = path.join("uploads", "transformed", filename);

  await processedImage.toFile(outputPath);

  const metadata = await sharp(outputPath).metadata();
  const stats = await fs.stat(outputPath);

  return {
    filename,
    path: outputPath,
    mimetype: `image/${metadata.format}`,
    size: stats.size,
    width: metadata.width,
    height: metadata.height,
  };
};

module.exports = {
  transformImage,
};
