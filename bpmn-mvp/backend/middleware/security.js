const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('../config/logger');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    skipSuccessfulRequests,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method
      });
      res.status(429).json({ error: message });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limit
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    10000, // limit each IP to 10 000 requests per windowMs (разработка)
    'Слишком много запросов с этого IP, попробуйте позже'
  ),

  // Strict rate limit for authentication endpoints
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 requests per windowMs
    'Слишком много попыток входа, попробуйте позже',
    true // don't count successful requests
  ),

  // Rate limit for registration
  register: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3, // limit each IP to 3 registrations per hour
    'Слишком много регистраций с этого IP, попробуйте позже'
  ),

  // Rate limit for password reset (if implemented)
  passwordReset: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3, // limit each IP to 3 password reset requests per hour
    'Слишком много запросов на сброс пароля, попробуйте позже'
  )
};

// Helmet configuration for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
});

// Security middleware to log suspicious activities
const securityLogger = (req, res, next) => {
  // Log all authentication attempts
  if (req.path.includes('/auth/')) {
    logger.info('Authentication attempt:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Log admin panel access
  if (req.path.includes('/admin') || req.path.includes('/users')) {
    logger.info('Admin access attempt:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      user: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Basic XSS protection - remove script tags and javascript: protocols
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// Error handling for security middleware
const securityErrorHandler = (err, req, res, next) => {
  logger.error('Security middleware error:', {
    error: err.message,
    stack: err.stack,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method
  });

  // Don't expose internal errors to client
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
};

module.exports = {
  rateLimiters,
  helmetConfig,
  securityLogger,
  sanitizeInput,
  securityErrorHandler
};