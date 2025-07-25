const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

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
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, 
    email TEXT UNIQUE, 
    name TEXT, 
    role TEXT,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY, 
    name TEXT, 
    description TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS project_users (
    id INTEGER PRIMARY KEY, 
    project_id INTEGER, 
    user_id INTEGER,
    role TEXT DEFAULT 'editor',
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS processes (
    id INTEGER PRIMARY KEY,
    project_id INTEGER,
    name TEXT,
    bpmn TEXT,
    author TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`);

  // Создаем админа по умолчанию
  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (email, name, role, password) VALUES (?, ?, ?, ?)`, 
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
      { id: user.id, email: user.email, role: user.role },
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

app.post('/api/auth/register', async (req, res) => {
  const { email, name, password, role = 'editor' } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)',
      [email, name, role, hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'User already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'User created successfully' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Пользователи (требует аутентификации)
app.get('/api/users', authenticateToken, (req, res) => {
  db.all('SELECT id, email, name, role FROM users', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/users', authenticateToken, async (req, res) => {
  const { email, name, role, password } = req.body;
  const hashedPassword = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('password123', 10);
  
  db.run('INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)', 
    [email, name, role, hashedPassword], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json({ id: this.lastID });
  });
});

// Проекты (требует аутентификации)
app.get('/api/projects', authenticateToken, (req, res) => {
  db.all('SELECT * FROM projects', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/projects', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  db.run('INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)', 
    [name, description, req.user.id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: this.lastID });
  });
});

// Обновление проекта (требует аутентификации)
app.put('/api/projects/:id', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  
  if (!name && !description) {
    return res.status(400).json({ error: 'No data provided for update' });
  }
  
  let query = 'UPDATE projects SET ';
  let params = [];
  let updates = [];
  
  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  
  if (description) {
    updates.push('description = ?');
    params.push(description);
  }
  
  query += updates.join(', ') + ' WHERE id = ?';
  params.push(req.params.id);
  
  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
});

// Назначение пользователей в проекты (требует аутентификации)
app.post('/api/project-users', authenticateToken, (req, res) => {
  const { project_id, user_id } = req.body;
  db.run('INSERT INTO project_users (project_id, user_id) VALUES (?, ?)', [project_id, user_id], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json({ id: this.lastID });
  });
});

app.get('/api/projects/:id/users', authenticateToken, (req, res) => {
  db.all(
    'SELECT users.* FROM users JOIN project_users ON users.id = project_users.user_id WHERE project_users.project_id = ?',
    [req.params.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Получение всех процессов проекта с автором и датой изменения (требует аутентификации)
app.get('/api/projects/:id/processes', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, project_id, name, author, updated_at FROM processes WHERE project_id = ? ORDER BY updated_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Создание нового процесса с автором и датой изменения (требует аутентификации)
app.post('/api/processes', authenticateToken, (req, res) => {
  const { project_id, name, bpmn, author } = req.body;
  db.run(
    `INSERT INTO processes (project_id, name, bpmn, author, updated_at) VALUES (?, ?, ?, ?, datetime('now'))`,
    [project_id, name, bpmn, author || 'Неизвестный автор'],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID });
    }
  );
});

// Получение одного процесса (требует аутентификации)
app.get('/api/processes/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM processes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Process not found' });
    }
    res.json(row);
  });
});

// Обновление процесса и даты изменения (требует аутентификации)
app.put('/api/processes/:id', authenticateToken, (req, res) => {
  const { bpmn, name } = req.body;
  
  // Если передано только название, обновляем только его
  if (name && !bpmn) {
    db.run(
      `UPDATE processes SET name = ?, updated_at = datetime('now') WHERE id = ?`,
      [name, req.params.id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
      }
    );
  } else if (bpmn && !name) {
    // Если передана только BPMN диаграмма
    db.run(
      `UPDATE processes SET bpmn = ?, updated_at = datetime('now') WHERE id = ?`,
      [bpmn, req.params.id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
      }
    );
  } else if (bpmn && name) {
    // Если переданы и название, и BPMN диаграмма
    db.run(
      `UPDATE processes SET name = ?, bpmn = ?, updated_at = datetime('now') WHERE id = ?`,
      [name, bpmn, req.params.id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
      }
    );
  } else {
    res.status(400).json({ error: 'No data provided for update' });
  }
});

// Удаление процесса (требует аутентификации)
app.delete('/api/processes/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM processes WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
});

app.listen(4000, () => {
  console.log('Backend running on http://localhost:4000');
  console.log('JWT Secret length:', JWT_SECRET.length);
});