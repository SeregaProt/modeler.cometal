const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Import security and validation middleware
const { rateLimiters, helmetConfig, securityLogger, sanitizeInput, securityErrorHandler } = require('./middleware/security');
const { validate, validateId } = require('./middleware/validation');
const logger = require('./config/logger');

const app = express();

// Security middleware
app.use(helmetConfig);
app.use(securityLogger);
app.use(sanitizeInput);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your production domain
    : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' })); // Limit payload size
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/auth/login', rateLimiters.auth);
app.use('/api/auth/register', rateLimiters.register);
// app.use('/api/', rateLimiters.general); // ОТКЛЮЧЕНО для разработки

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Enhanced JWT middleware with better error handling
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Authentication attempt without token:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    return res.status(401).json({ error: 'Токен доступа отсутствует' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Invalid token used:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        error: err.message
      });
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Требуется аутентификация' });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt:', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        ip: req.ip
      });
      return res.status(403).json({ error: 'Недостаточно прав доступа' });
    }
    
    next();
  };
};

// Database initialization with better error handling
const db = new sqlite3.Database('./db.sqlite', (err) => {
  if (err) {
    logger.error('Database connection failed:', err);
    process.exit(1);
  }
  logger.info('Connected to SQLite database');
});

// Database schema initialization
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, 
    email TEXT UNIQUE, 
    name TEXT, 
    role TEXT DEFAULT 'editor',
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY, 
    name TEXT NOT NULL, 
    description TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS project_users (
    id INTEGER PRIMARY KEY, 
    project_id INTEGER, 
    user_id INTEGER,
    role TEXT DEFAULT 'editor',
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(project_id, user_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS processes (
    id INTEGER PRIMARY KEY,
    project_id INTEGER,
    name TEXT NOT NULL,
    bpmn TEXT,
    author TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    position_x REAL DEFAULT NULL,
    position_y REAL DEFAULT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`);

  // Create table for process relations (ER-диаграмма)
  db.run(`CREATE TABLE IF NOT EXISTS process_relations (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL,
    from_process_id INTEGER NOT NULL,
    to_process_id INTEGER NOT NULL,
    relation_type TEXT DEFAULT 'one-to-one',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (from_process_id) REFERENCES processes(id),
    FOREIGN KEY (to_process_id) REFERENCES processes(id)
  )`);

  // Create default admin user
  const adminPassword = bcrypt.hashSync('admin123', 12); // Increased salt rounds
  db.run(`INSERT OR IGNORE INTO users (email, name, role, password) VALUES (?, ?, ?, ?)`, 
    ['admin@example.com', 'Admin User', 'admin', adminPassword], (err) => {
      if (err) {
        logger.error('Failed to create default admin user:', err);
      } else {
        logger.info('Default admin user created or already exists');
      }
    });

  // Migration: add position_x, position_y columns if not exist
  db.run(`ALTER TABLE processes ADD COLUMN position_x REAL DEFAULT NULL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      logger.error('Error adding position_x column:', err);
    }
  });
  db.run(`ALTER TABLE processes ADD COLUMN position_y REAL DEFAULT NULL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      logger.error('Error adding position_y column:', err);
    }
  });
});

// Enhanced authentication endpoints
app.post('/api/auth/login', validate('login'), async (req, res) => {
  const { email, password } = req.body;
  
  try {
    db.get('SELECT * FROM users WHERE email = ? AND is_active = 1', [email], async (err, user) => {
      if (err) {
        logger.error('Database error during login:', err);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
      
      if (!user) {
        logger.warn('Login attempt with non-existent email:', {
          email,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        logger.warn('Login attempt with invalid password:', {
          userId: user.id,
          email,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }
      
      // Update last login
      db.run('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);
      
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      logger.info('Successful login:', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });
      
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role 
        }
      });
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/auth/register', validate('register'), async (req, res) => {
  const { email, name, password, role = 'editor' } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds
    
    db.run(
      'INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)',
      [email, name, role, hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            logger.warn('Registration attempt with existing email:', {
              email,
              ip: req.ip,
              userAgent: req.get('User-Agent')
            });
            return res.status(400).json({ error: 'Пользователь с так��м email уже существует' });
          }
          logger.error('Database error during registration:', err);
          return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        
        logger.info('New user registered:', {
          userId: this.lastID,
          email,
          name,
          role,
          ip: req.ip
        });
        
        // Auto-login after registration
        const token = jwt.sign(
          { id: this.lastID, email, role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        res.status(201).json({ 
          token,
          user: { 
            id: this.lastID, 
            email, 
            name, 
            role 
          }
        });
      }
    );
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Enhanced user management endpoints
app.get('/api/users', authenticateToken, requireRole(['admin']), (req, res) => {
  db.all(
    'SELECT id, email, name, role, created_at, last_login, is_active FROM users ORDER BY created_at DESC', 
    [], 
    (err, rows) => {
      if (err) {
        logger.error('Error fetching users:', err);
        return res.status(500).json({ error: 'Ошибка получения пользователей' });
      }
      res.json(rows);
    }
  );
});

app.post('/api/users', authenticateToken, requireRole(['admin']), validate('createUser'), async (req, res) => {
  const { email, name, role, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    db.run(
      'INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)', 
      [email, name, role, hashedPassword], 
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
          }
          logger.error('Error creating user:', err);
          return res.status(500).json({ error: 'Ошибка создания пользователя' });
        }
        
        logger.info('User created by admin:', {
          createdUserId: this.lastID,
          adminId: req.user.id,
          email,
          name,
          role
        });
        
        res.status(201).json({ 
          id: this.lastID,
          email,
          name,
          role
        });
      }
    );
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Enhanced project management endpoints
app.get('/api/projects', authenticateToken, (req, res) => {
  // Get projects where user is assigned or is admin
  const query = req.user.role === 'admin' 
    ? 'SELECT p.*, u.name as creator_name FROM projects p LEFT JOIN users u ON p.created_by = u.id ORDER BY p.updated_at DESC'
    : `SELECT p.*, u.name as creator_name FROM projects p 
       LEFT JOIN users u ON p.created_by = u.id
       LEFT JOIN project_users pu ON p.id = pu.project_id 
       WHERE pu.user_id = ? OR p.created_by = ? 
       ORDER BY p.updated_at DESC`;
  
  const params = req.user.role === 'admin' ? [] : [req.user.id, req.user.id];
  
  db.all(query, params, (err, rows) => {
    if (err) {
      logger.error('Error fetching projects:', err);
      return res.status(500).json({ error: 'Ошибка получения проектов' });
    }
    res.json(rows);
  });
});

app.post('/api/projects', authenticateToken, validate('createProject'), (req, res) => {
  const { name, description } = req.body;
  
  db.run(
    'INSERT INTO projects (name, description, created_by, updated_at) VALUES (?, ?, ?, datetime("now"))', 
    [name, description, req.user.id], 
    function (err) {
      if (err) {
        logger.error('Error creating project:', err);
        return res.status(500).json({ error: 'Ошибка создания проекта' });
      }
      
      // Auto-assign creator to project
      db.run(
        'INSERT INTO project_users (project_id, user_id, role) VALUES (?, ?, ?)',
        [this.lastID, req.user.id, 'admin'],
        (err) => {
          if (err) {
            logger.error('Error assigning creator to project:', err);
          }
        }
      );
      
      logger.info('Project created:', {
        projectId: this.lastID,
        name,
        createdBy: req.user.id
      });
      
      res.status(201).json({ 
        id: this.lastID,
        name,
        description,
        created_by: req.user.id
      });
    }
  );
});

// Enhanced project user management
app.post('/api/project-users', authenticateToken, validate('assignUser'), (req, res) => {
  const { project_id, user_id } = req.body;
  
  // Check if user has permission to assign users to this project
  db.get(
    'SELECT * FROM project_users WHERE project_id = ? AND user_id = ? AND role IN ("admin", "owner")',
    [project_id, req.user.id],
    (err, permission) => {
      if (err) {
        logger.error('Error checking project permissions:', err);
        return res.status(500).json({ error: 'Ошибка проверки прав доступа' });
      }
      
      if (!permission && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Недостаточно прав для назначения пользователей' });
      }
      
      db.run(
        'INSERT OR IGNORE INTO project_users (project_id, user_id) VALUES (?, ?)', 
        [project_id, user_id], 
        function (err) {
          if (err) {
            logger.error('Error assigning user to project:', err);
            return res.status(500).json({ error: 'Ошибка назначения пользователя' });
          }
          
          logger.info('User assigned to project:', {
            projectId: project_id,
            userId: user_id,
            assignedBy: req.user.id
          });
          
          res.status(201).json({ id: this.lastID });
        }
      );
    }
  );
});

app.get('/api/projects/:id/users', authenticateToken, validateId(), (req, res) => {
  db.all(
    `SELECT u.id, u.email, u.name, u.role as user_role, pu.role as project_role, pu.assigned_at 
     FROM users u 
     JOIN project_users pu ON u.id = pu.user_id 
     WHERE pu.project_id = ? 
     ORDER BY pu.assigned_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) {
        logger.error('Error fetching project users:', err);
        return res.status(500).json({ error: 'Ошибка получения участников проекта' });
      }
      res.json(rows);
    }
  );
});

// Enhanced project update endpoint
app.put('/api/projects/:id', authenticateToken, validateId(), (req, res) => {
  const { name, description } = req.body;
  const updates = [];
  const values = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  updates.push('updated_at = datetime("now")');
  values.push(req.params.id);

  if (updates.length === 1) {
    return res.status(400).json({ error: 'Нет данных для обновления' });
  }

  db.run(
    `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function (err) {
      if (err) {
        logger.error('Error updating project:', err);
        return res.status(500).json({ error: 'Ошибка обновления проекта' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Проект не найден' });
      }
      logger.info('Project updated:', {
        projectId: req.params.id,
        updatedBy: req.user.id,
        changes: this.changes
      });
      res.json({ success: true, changes: this.changes });
    }
  );
});

// --- Process Relations (ER-диаграмма) endpoints ---
// Получить все связи для проекта
app.get('/api/projects/:id/process-relations', authenticateToken, validateId(), (req, res) => {
  db.all(
    `SELECT * FROM process_relations WHERE project_id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err) {
        logger.error('Error fetching process relations:', err);
        return res.status(500).json({ error: 'Ошибка получения связей процессов' });
      }
      res.json(rows);
    }
  );
});

// Добавить новую связь
app.post('/api/process-relations', authenticateToken, (req, res) => {
  const { project_id, from_process_id, to_process_id, relation_type } = req.body;
  if (!project_id || !from_process_id || !to_process_id) {
    return res.status(400).json({ error: 'project_id, from_process_id, to_process_id обязательны' });
  }
  db.run(
    `INSERT INTO process_relations (project_id, from_process_id, to_process_id, relation_type) VALUES (?, ?, ?, ?)`,
    [project_id, from_process_id, to_process_id, relation_type || 'one-to-one'],
    function (err) {
      if (err) {
        logger.error('Error creating process relation:', err);
        return res.status(500).json({ error: 'Ошибка создания связи процессов' });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Удалить связь
app.delete('/api/process-relations/:id', authenticateToken, validateId(), (req, res) => {
  db.run('DELETE FROM process_relations WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      logger.error('Error deleting process relation:', err);
      return res.status(500).json({ error: 'Ошибка удаления связи процессов' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Связь не найдена' });
    }
    res.json({ success: true });
  });
});

// Enhanced process management endpoints
app.get('/api/projects/:id/processes', authenticateToken, validateId(), (req, res) => {
  db.all(
    `SELECT id, project_id, name, author, created_at, updated_at, version, position_x, position_y
     FROM processes 
     WHERE project_id = ? 
     ORDER BY updated_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) {
        logger.error('Error fetching processes:', err);
        return res.status(500).json({ error: 'Ошибка получения процессов' });
      }
      res.json(rows);
    }
  );
});

app.post('/api/processes', authenticateToken, validate('createProcess'), (req, res) => {
  const { project_id, name, bpmn } = req.body;
  const author = req.user.name || req.user.email || 'Неизвестный автор';
  
  db.run(
    `INSERT INTO processes (project_id, name, bpmn, author, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))`,
    [project_id, name, bpmn || '', author],
    function (err) {
      if (err) {
        logger.error('Error creating process:', err);
        return res.status(500).json({ error: 'Ошибка создания процесса' });
      }
      
      logger.info('Process created:', {
        processId: this.lastID,
        projectId: project_id,
        name,
        author: req.user.id
      });
      
      res.status(201).json({ 
        id: this.lastID,
        project_id,
        name,
        author
      });
    }
  );
});

app.get('/api/processes/:id', authenticateToken, validateId(), (req, res) => {
  db.get('SELECT * FROM processes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      logger.error('Error fetching process:', err);
      return res.status(500).json({ error: 'Ошибка получения процесса' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Процесс не найден' });
    }
    
    res.json(row);
  });
});

// Update process position (должен быть выше общего маршрута PUT /api/processes/:id)
app.put('/api/processes/:id/position', authenticateToken, validateId(), (req, res) => {
  const { position_x, position_y } = req.body;
  const processId = req.params.id;
  
  if (position_x === undefined || position_y === undefined) {
    return res.status(400).json({ error: 'position_x and position_y are required' });
  }
  
  db.run(
    `UPDATE processes SET position_x = ?, position_y = ?, updated_at = datetime('now') WHERE id = ?`,
    [position_x, position_y, processId],
    function (err) {
      if (err) {
        logger.error('Error updating process position:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Process not found' });
      }
      
      logger.info('Process position updated:', {
        processId: req.params.id,
        position_x,
        position_y,
        updatedBy: req.user.id
      });
      
      res.json({ success: true });
    }
  );
});

app.put('/api/processes/:id', authenticateToken, validateId(), validate('updateProcess'), (req, res) => {
  const { name, bpmn } = req.body;
  const updates = [];
  const values = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  
  if (bpmn !== undefined) {
    updates.push('bpmn = ?');
    values.push(bpmn);
  }
  
  updates.push('updated_at = datetime("now")');
  updates.push('version = version + 1');
  values.push(req.params.id);
  
  db.run(
    `UPDATE processes SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function (err) {
      if (err) {
        logger.error('Error updating process:', err);
        return res.status(500).json({ error: 'Ошибка обновления процесса' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Процесс не найден' });
      }
      
      logger.info('Process updated:', {
        processId: req.params.id,
        updatedBy: req.user.id,
        changes: this.changes
      });
      
      res.json({ success: true, changes: this.changes });
    }
  );
});

app.delete('/api/processes/:id', authenticateToken, validateId(), (req, res) => {
  db.run('DELETE FROM processes WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      logger.error('Error deleting process:', err);
      return res.status(500).json({ error: 'Ошибка удаления процесса' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Процесс не найден' });
    }
    
    logger.info('Process deleted:', {
      processId: req.params.id,
      deletedBy: req.user.id
    });
    
    res.json({ success: true });
  });
});

app.delete('/api/projects/:id', authenticateToken, validateId(), (req, res) => {
  const projectId = req.params.id;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run('DELETE FROM processes WHERE project_id = ?', [projectId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        logger.error('Failed to delete processes for project', { projectId, error: err });
        return res.status(500).json({ error: 'Failed to delete processes' });
      }

      db.run('DELETE FROM project_users WHERE project_id = ?', [projectId], (err) => {
        if (err) {
          db.run('ROLLBACK');
          logger.error('Failed to delete project users', { projectId, error: err });
          return res.status(500).json({ error: 'Failed to delete project users' });
        }

        db.run('DELETE FROM projects WHERE id = ?', [projectId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            logger.error('Failed to delete project', { projectId, error: err });
            return res.status(500).json({ error: 'Failed to delete project' });
          }

          if (this.changes === 0) {
            db.run('ROLLBACK');
            logger.warn('Project not found for delete', { projectId });
            return res.status(404).json({ error: 'Project not found' });
          }

          db.run('COMMIT');
          logger.info('Project and related data deleted', { projectId, deletedBy: req.user.id });
          res.json({ success: true, message: 'Project and all related data deleted successfully' });
        });
      });
    });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(securityErrorHandler);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 - Route not found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({ error: 'Маршрут не найден' });
});

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    db.close();
    process.exit(0);
  });
});

module.exports = app; // Export for testing