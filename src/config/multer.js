const multer = require("multer");
const path = require("path");

// Configure disk storage
const storage = multer.diskStorage({
  // Folder where uploaded files will be stored
  destination: (req, file, cb) => {
    cb(null, "uploads/originals/");
  },

  // Generate a unique and readable filename
  filename: (req, file, cb) => {
    // Remove the extension from the original filename
    const originalName = path.parse(file.originalname).name;

    // Replace spaces with hyphens and convert to lowercase
    const sanitizedName = originalName
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "")
      .toLowerCase();

    // Keep the original extension
    const extension = path.extname(file.originalname).toLowerCase();

    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${sanitizedName}${extension}`;

    cb(null, uniqueFilename);
  },
});

// Allow only image files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WEBP, and GIF images are allowed."), false);
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = upload;
