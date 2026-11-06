const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protectAdmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'mltify_super_secure_jwt_secret_key_2026'
      );

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Administrator privileges required',
        });
      }

      next();
    } catch (error) {
      console.error('JWT Auth Error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authorization token',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token missing. Please sign in as admin.',
    });
  }
};

module.exports = { protectAdmin };

