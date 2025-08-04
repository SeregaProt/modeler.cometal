const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Импорт middleware для пагинации
const { paginate, createPaginatedResponse, executePaginatedQuery } = require('./middleware/pagination');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Используем тот же секрет, что и в enhanced версии
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars';

// Middleware для проверки JWT токена с улучшенной обработкой ошибок
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Токен доступа отсутствует' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token verification failed:', err.message);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Токен истек' });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: 'Недействительный токен' });
      }
      return res.status(403).json({ error: 'Ошибка проверки токена' });
    }
    req.user = user;
    next();
  });
};

// Инициализация БД
const db = new sqlite3.Database('./db.sqlite');

db.serialize(() => {
  db.run(\`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, 
    email TEXT UNIQUE, 
    name TEXT, 
    role TEXT,
    password TEXT
  )\`);

  db.run(\`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY, 
    name TEXT, 
    description TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )\`);

  db.run(\`CREATE TABLE IF NOT EXISTS project_users (
    id INTEGER PRIMARY KEY, 
    project_id INTEGER, 
    user_id INTEGER,
    role TEXT DEFAULT 'editor',
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )\`);

  db.run(\`CREATE TABLE IF NOT EXISTS processes (
    id INTEGER PRIMARY KEY,
    project_id INTEGER,
    name TEXT,
    bpmn TEXT,
    author TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    position_x REAL DEFAULT NULL,
    position_y REAL DEFAULT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )\`);

  // Создаем таблицу для связей процессов (ER-диаграмма)
  db.run(\`CREATE TABLE IF NOT EXISTS process_relations (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL,
    from_process_id INTEGER NOT NULL,
    to_process_id INTEGER NOT NULL,
    relation_type TEXT DEFAULT 'one-to-one',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (from_process_id) REFERENCES processes(id),
    FOREIGN KEY (to_process_id) REFERENCES processes(id)
  )\`);

  // Создаем админа по умолчанию
  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.run(\`INSERT OR IGNORE INTO users (email, name, role, password) VALUES (?, ?, ?, ?)\`, 
    ['admin@example.com', 'Admin User', 'admin', adminPassword]);
});

// Аутентификация
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('User logged in:', user.email, 'Token created with secret length:', JWT_SECRET.length);
    
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  });
});

// Получение всех процессов проекта с пагинацией (требует аутентификации)
app.get('/api/projects/:id/processes', authenticateToken, paginate({ defaultLimit: 20, maxLimit: 100 }), async (req, res) => {
  const { limit, offset } = req.pagination;
  const projectId = req.params.id;
  
  try {
    const countQuery = 'SELECT COUNT(*) as total FROM processes WHERE project_id = ?';
    const dataQuery = \`
      SELECT id, project_id, name, author, updated_at, position_x, position_y,
             CASE WHEN bpmn IS NOT NULL AND bpmn != '' THEN 1 ELSE 0 END as has_diagram
      FROM processes 
      WHERE project_id = ? 
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    \`;
    
    const countParams = [projectId];
    const dataParams = [projectId, limit, offset];
    
    const { total, data } = await executePaginatedQuery(db, countQuery, dataQuery, countParams, dataParams);
    const response = createPaginatedResponse(data, total, req.pagination);
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching processes:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Создание нового процесса с автором и датой изменения (требует аутентификации)
app.post('/api/processes', authenticateToken, (req, res) => {
  const { project_id, name, bpmn } = req.body;
  
  // Используем имя пользователя из токена аутентификации
  const authorName = req.user.name || req.user.email || 'Неизвестный автор';
  
  console.log('Creating process:', {
    project_id,
    name,
    author: authorName,
    user: req.user
  });
  
  db.run(
    \`INSERT INTO processes (project_id, name, bpmn, author, updated_at) VALUES (?, ?, ?, ?, datetime('now'))\`,
    [project_id, name, bpmn || null, authorName],
    function (err) {
      if (err) {
        console.error('Error creating process:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      console.log('Process created successfully:', {
        id: this.lastID,
        author: authorName
      });
      
      res.json({ 
        id: this.lastID,
        author: authorName
      });
    }
  );
});

// --- API endpoints для связей процессов (ER-диаграмма) ---

// Получить все связи для проекта
app.get('/api/projects/:id/process-relations', authenticateToken, (req, res) => {
  console.log('🔍 Запрос связей для проекта:', req.params.id);
  db.all(
    \`SELECT * FROM process_relations WHERE project_id = ?\`,
    [req.params.id],
    (err, rows) => {
      if (err) {
        console.error('Error fetching process relations:', err);
        return res.status(500).json({ error: 'Ошибка получения связей процессов' });
      }
      console.log('📊 Найдено связей:', rows.length);
      res.json(rows);
    }
  );
});

// Добавить новую связь
app.post('/api/process-relations', authenticateToken, (req, res) => {
  const { project_id, from_process_id, to_process_id, relation_type } = req.body;
  
  console.log('🔗 Создание связи:', { project_id, from_process_id, to_process_id, relation_type });
  
  if (!project_id || !from_process_id || !to_process_id) {
    return res.status(400).json({ error: 'project_id, from_process_id, to_process_id обязательны' });
  }
  
  // Проверяем, что не создаем дубликат связи
  db.get(
    'SELECT id FROM process_relations WHERE project_id = ? AND from_process_id = ? AND to_process_id = ?',
    [project_id, from_process_id, to_process_id],
    (err, existing) => {
      if (err) {
        console.error('Error checking existing relation:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (existing) {
        console.log('⚠️ Связь уже существует:', existing);
        return res.status(400).json({ error: 'Связь уже существует' });
      }
      
      db.run(
        \`INSERT INTO process_relations (project_id, from_process_id, to_process_id, relation_type) VALUES (?, ?, ?, ?)\`,
        [project_id, from_process_id, to_process_id, relation_type || 'one-to-one'],
        function (err) {
          if (err) {
            console.error('Error creating process relation:', err);
            return res.status(500).json({ error: 'Ошибка создания связи процессов' });
          }
          console.log('✅ Связь создана с ID:', this.lastID);
          res.status(201).json({ id: this.lastID });
        }
      );
    }
  );
});

// Удалить связь
app.delete('/api/process-relations/:id', authenticateToken, (req, res) => {
  console.log('🗑️ Удаление связи:', req.params.id);
  db.run('DELETE FROM process_relations WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      console.error('Error deleting process relation:', err);
      return res.status(500).json({ error: 'Ошибка удаления связи процессов' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Связь не найдена' });
    }
    console.log('✅ Связь удалена');
    res.json({ success: true });
  });
});

app.listen(4000, () => {
  console.log('✅ Backend running on http://localhost:4000');
  console.log('🔑 JWT Secret length:', JWT_SECRET.length);
});