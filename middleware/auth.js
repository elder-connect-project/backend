const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * JWT Token Verification Middleware
 * Verifies the access token from Authorization header
 * Usage: router.get('/protected', auth, handler)
 */
module.exports = async function auth(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ 
        message: "No token provided",
        error: "Authorization header with Bearer token is required"
      });
    }

    // Verify JWT token
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    
    // Check if token is a refresh token (should not be used as access token)
    if (payload.type === "refresh") {
      return res.status(401).json({ 
        message: "Invalid token type",
        error: "Refresh token cannot be used as access token"
      });
    }

    // Find user from token payload
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ 
        message: "Invalid token",
        error: "User not found"
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        message: "Account inactive",
        error: "User account is deactivated"
      });
    }

    // Attach user to request object
    req.user = user;
    req.userId = user._id;
    next();
  } catch (e) {
    // Handle different JWT errors
    if (e.name === "TokenExpiredError") {
      return res.status(401).json({ 
        message: "Token expired",
        error: "Please refresh your token or login again"
      });
    }
    if (e.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        message: "Invalid token",
        error: "Token is malformed or invalid"
      });
    }
    console.error("[AUTH MIDDLEWARE ERROR]", e);
    return res.status(401).json({ 
      message: "Unauthorized",
      error: process.env.NODE_ENV === "development" ? e.message : undefined
    });
  }
};
