# 🔒 Критические исправления безопасности

## 1. Усиление JWT секрета

### Проблема
Использование слабого JWT секрета по умолчанию в production.

### Решение
```bash
# Создать .env файл в backend/
echo "JWT_SECRET=$(openssl rand -base64 64)" > backend/.env
```

### Код исправления
```javascript
// backend/index.js
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set and at least 32 characters long');
  process.exit(1);
}
```

## 2. Добавление валидации входных данных

### Установка зависимостей
```bash
cd backend
npm install joi
```

### Middleware валидации
```javascript
// backend/middleware/validation.js
const Joi = require('joi');

const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),
  register: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(50).required(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid('admin', 'editor', 'viewer').default('editor')
  }),
  createProject: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).allow('')
  })
};

const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({ error: 'Validation schema not found' });
    }

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    req.body = value;
    next();
  };
};

module.exports = { validate };
```

## 3. Добавление rate limiting

### Установка зависимостей
```bash
cd backend
npm install express-rate-limit
```

### Rate limiting middleware
```javascript
// backend/middleware/rateLimiting.js
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const rateLimiters = {
  general: createRateLimiter(15 * 60 * 1000, 100, 'Too many requests'),
  auth: createRateLimiter(15 * 60 * 1000, 5, 'Too many login attempts'),
  register: createRateLimiter(60 * 60 * 1000, 3, 'Too many registration attempts')
};

module.exports = { rateLimiters };
```

## 4. Защита от XSS

### Установка зависимостей
```bash
cd backend
npm install helmet xss
```

### Security middleware
```javascript
// backend/middleware/security.js
const helmet = require('helmet');
const xss = require('xss');

const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
});

const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return xss(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
};

module.exports = { helmetConfig, sanitizeInput };
```