const Joi = require('joi');
const logger = require('../config/logger');

// Validation schemas
const schemas = {
  // User registration
  register: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Имя должно содержать минимум 2 символа',
      'string.max': 'Имя не должно превышать 50 символов',
      'any.required': 'Имя обязательно для заполнения'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Введите корректный email адрес',
      'any.required': 'Email обязателен для заполнения'
    }),
    password: Joi.string().min(6).max(128).required().messages({
      'string.min': 'Пароль должен содержать минимум 6 символов',
      'string.max': 'Пароль не должен превышать 128 символов',
      'any.required': 'Пароль обязателен для заполнения'
    })
  }),

  // User login
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Введите корректный email адрес',
      'any.required': 'Email обязателен для заполнения'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Пароль обязателен для заполнения'
    })
  }),

  // Project creation
  createProject: Joi.object({
    name: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Название проекта не может быть пустым',
      'string.max': 'Название проекта не должно превышать 100 символов',
      'any.required': 'Название проекта обязательно для заполнения'
    }),
    description: Joi.string().max(500).allow('').messages({
      'string.max': 'Описание не должно превышать 500 символов'
    })
  }),

  // Process creation
  createProcess: Joi.object({
    name: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Название процесса не может быть пустым',
      'string.max': 'Название процесса не должно превышать 100 символов',
      'any.required': 'Название процесса обязательно для заполнения'
    }),
    project_id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID проекта должен быть числом',
      'number.positive': 'ID проекта должен быть положительным числом',
      'any.required': 'ID проекта обязателен'
    })
  }),

  // Process update
  updateProcess: Joi.object({
    name: Joi.string().min(1).max(100).messages({
      'string.min': 'Название процесса не может быть пустым',
      'string.max': 'Название процесса не должно превышать 100 символов'
    }),
    bpmn: Joi.string().allow('').messages({
      'string.base': 'BPMN должен быть строкой'
    })
  }).min(1).messages({
    'object.min': 'Необходимо указать хотя бы одно поле для обновления'
  }),

  // User creation (admin)
  createUser: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Имя должно содержать минимум 2 символа',
      'string.max': 'Имя не должно превышать 50 символов',
      'any.required': 'Имя обязательно для заполнения'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Введите корректный email адрес',
      'any.required': 'Email обязателен для заполнения'
    }),
    password: Joi.string().min(6).max(128).required().messages({
      'string.min': 'Пароль должен содержать минимум 6 символов',
      'string.max': 'Пароль не должен превышать 128 символов',
      'any.required': 'Пароль обязателен для заполнения'
    }),
    role: Joi.string().valid('admin', 'editor', 'viewer').default('editor').messages({
      'any.only': 'Роль должна быть одной из: admin, editor, viewer'
    })
  }),

  // Project user assignment
  assignUser: Joi.object({
    user_id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID пользователя должен быть числом',
      'number.positive': 'ID пользователя должен быть положительным числом',
      'any.required': 'ID пользователя обязателен'
    }),
    project_id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID проекта должен быть числом',
      'number.positive': 'ID проекта должен быть положительным числом',
      'any.required': 'ID проекта обязателен'
    })
  })
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      logger.error(`Validation schema '${schemaName}' not found`);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      logger.warn(`Validation failed for ${schemaName}:`, {
        errors: error.details,
        body: req.body,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(400).json({ 
        error: errorMessage,
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Parameter validation for IDs
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = parseInt(req.params[paramName]);
    
    if (isNaN(id) || id <= 0) {
      logger.warn(`Invalid ${paramName} parameter:`, {
        [paramName]: req.params[paramName],
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(400).json({ 
        error: `Некорректный ${paramName === 'id' ? 'ID' : paramName}` 
      });
    }
    
    req.params[paramName] = id;
    next();
  };
};

module.exports = {
  validate,
  validateId,
  schemas
};