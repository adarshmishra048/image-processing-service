const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Original filename uploaded by the user
    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    // Stored filename
    filename: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    // Local path (later replace with cloud URL)
    path: {
      type: String,
      required: true,
    },

    mimetype: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
      min: 0,
    },

    width: {
      type: Number,
      min: 1,
    },

    height: {
      type: Number,
      min: 1,
    },

    // Whether this is the original upload
    isOriginal: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Link transformed images back to the original
    originalImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
      default: null,
      index: true,
    },

    // Stable hash of transformation parameters for cache lookup
    transformHash: {
      type: String,
      default: null,
      index: true,
    },

    // Store transformation parameters for caching/auditing
    transformationParams: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient pagination
imageSchema.index({ owner: 1, createdAt: -1 });

// Index for retrieving transformed variants of an original
imageSchema.index({ originalImage: 1, createdAt: -1 });

// Compound cache index: one transformed variant per original + hash
imageSchema.index(
  { originalImage: 1, transformHash: 1 },
  {
    unique: true,
    partialFilterExpression: {
      originalImage: { $type: "objectId" },
      transformHash: { $type: "string" },
    },
  },
);

module.exports = mongoose.model("Image", imageSchema);
