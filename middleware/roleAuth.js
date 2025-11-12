const User = require('../models/User');

/**
 * Role-based Authorization Middleware
 * Usage: router.get('/route', auth, requireRole('family'), handler)
 * Usage: router.get('/route', auth, requireRoles(['family', 'elder']), handler)
 */

/**
 * Require a specific role
 * @param {string} role - Required role (elder, family, driver)
 */
function requireRole(role) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: "Unauthorized",
        error: "Authentication required"
      });
    }

    // Refresh user from database to get latest role
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

    // Update req.user with latest data
    req.user = user;
    next();
  };
}

/**
 * Require one of multiple roles
 * @param {string[]} roles - Array of allowed roles
 */
function requireRoles(roles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: "Unauthorized",
        error: "Authentication required"
      });
    }

    // Refresh user from database to get latest role
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

    // Update req.user with latest data
    req.user = user;
    next();
  };
}

/**
 * Optional role check - allows access but adds role info to request
 * Useful for routes that work differently based on role
 */
function checkRole() {
  return async (req, res, next) => {
    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user) {
        req.user = user;
        req.userRole = user.role;
      }
    }
    next();
  };
}

module.exports = {
  requireRole,
  requireRoles,
  checkRole
};

