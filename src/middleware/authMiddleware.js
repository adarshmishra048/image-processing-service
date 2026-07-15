const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  // Read the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Access denied. No token provided.",
        });
    }

  try {
    // Extract the token (remove "Bearer ")
    const token = authHeader.split(" ")[1];

    // Verify the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
