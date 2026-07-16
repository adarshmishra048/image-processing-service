const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  /**
   * Mongoose - Invalid ObjectId
   */
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID.";
  }

  /**
   * Mongoose - Validation Error
   */
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
  }

  /**
   * MongoDB - Duplicate Key
   */
  if (err.code === 11000) {
    statusCode = 409;

    const field = Object.keys(err.keyValue)[0];

    message = `${field} already exists.`;
  }

  /**
   * JWT - Invalid Token
   */
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token.";
  }

  /**
   * JWT - Expired Token
   */
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired.";
  }

  /**
   * Multer Errors
   */
  if (err.name === "MulterError") {
    statusCode = 400;

    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        message = "File size exceeds the maximum limit of 5 MB.";
        break;

      case "LIMIT_UNEXPECTED_FILE":
        message = "Unexpected file field.";
        break;

      default:
        message = err.message;
    }
  }

  /**
   * Response
   */
  res.status(statusCode).json({
    success: false,
    message,

    // Only include stack trace in development
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
};

module.exports = errorMiddleware;