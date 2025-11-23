/**
 * Combined Middleware Module
 * Exports all authentication and authorization middleware
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ============================================
// JWT Authentication Middleware
// ============================================
async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ 
        message: "No token provided",
        error: "Authorization header with Bearer token is required"
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    
    if (payload.type === "refresh") {
      return res.status(401).json({ 
        message: "Invalid token type",
        error: "Refresh token cannot be used as access token"
      });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ 
        message: "Invalid token",
        error: "User not found"
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        message: "Account inactive",
        error: "User account is deactivated"
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (e) {
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
}

// ============================================
// API Key Authentication Middleware
// ============================================
function apiKeyAuth(req, res, next) {
  const apiKey = req.header('x-api-key');
  const userId = req.header('x-user-id');

  if (!apiKey || apiKey !== (process.env.API_KEY || '')) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
  if (!userId) {
    return res.status(400).json({ message: 'x-user-id header is required' });
  }

  req.apiUserId = userId;
  return next();
}

// ============================================
// Role-based Authorization Middleware
// ============================================
function requireRole(role) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: "Unauthorized",
        error: "Authentication required"
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ 
        message: "User not found",
        error: "Invalid user"
      });
    }

    if (user.role !== role) {
      return res.status(403).json({ 
        message: "Forbidden",
        error: `This endpoint requires ${role} role. Your role is ${user.role || 'not set'}`
      });
    }

    req.user = user;
    next();
  };
}

function requireRoles(roles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: "Unauthorized",
        error: "Authentication required"
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ 
        message: "User not found",
        error: "Invalid user"
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ 
        message: "Forbidden",
        error: `This endpoint requires one of these roles: ${roles.join(', ')}. Your role is ${user.role || 'not set'}`
      });
    }

    req.user = user;
    next();
  };
}

// ============================================
// Exports
// ============================================
module.exports = {
  auth,
  apiKeyAuth,
  requireRole,
  requireRoles
};

// Backward compatibility - individual exports
module.exports.auth = auth;
module.exports.apiKeyAuth = apiKeyAuth;
module.exports.requireRole = requireRole;
module.exports.requireRoles = requireRoles;

