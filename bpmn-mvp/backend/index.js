const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
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

// Пользователи
app.get('/api/users', (req, res) => {
  db.all('SELECT id, email, name, role FROM users', [], (err, rows) => res.json(rows));
});

app.post('/api/users', async (req, res) => {
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

// Проекты
app.get('/api/projects', (req, res) => {
  db.all('SELECT * FROM projects', [], (err, rows) => res.json(rows));
});

app.post('/api/projects', (req, res) => {
  const { name, description } = req.body;
  db.run('INSERT INTO projects (name, description) VALUES (?, ?)', [name, description], function (err) {
    res.json({ id: this.lastID });
  });
});

// Назначение пользователей в проекты
app.post('/api/project-users', (req, res) => {
  const { project_id, user_id } = req.body;
  db.run('INSERT INTO project_users (project_id, user_id) VALUES (?, ?)', [project_id, user_id], function (err) {
    res.json({ id: this.lastID });
  });
});

app.get('/api/projects/:id/users', (req, res) => {
  db.all(
    'SELECT users.* FROM users JOIN project_users ON users.id = project_users.user_id WHERE project_users.project_id = ?',
    [req.params.id],
    (err, rows) => res.json(rows)
  );
});

// Получение всех процессов проекта с автором и датой изменения
app.get('/api/projects/:id/processes', (req, res) => {
  db.all(
    `SELECT id, project_id, name, author, updated_at FROM processes WHERE project_id = ? ORDER BY updated_at DESC`,
    [req.params.id],
    (err, rows) => res.json(rows)
  );
});

// Создание нового процесса с автором и датой изменения
app.post('/api/processes', (req, res) => {
  const { project_id, name, bpmn, author } = req.body;
  db.run(
    `INSERT INTO processes (project_id, name, bpmn, author, updated_at) VALUES (?, ?, ?, ?, datetime('now'))`,
    [project_id, name, bpmn, author || 'Неизвестный автор'],
    function (err) {
      res.json({ id: this.lastID });
    }
  );
});

// Получение одного процесса
app.get('/api/processes/:id', (req, res) => {
  db.get('SELECT * FROM processes WHERE id = ?', [req.params.id], (err, row) => res.json(row));
});

// Обновление процесса и даты изменения
app.put('/api/processes/:id', (req, res) => {
  const { bpmn } = req.body;
  db.run(
    `UPDATE processes SET bpmn = ?, updated_at = datetime('now') WHERE id = ?`,
    [bpmn, req.params.id],
    function (err) {
      res.json({ success: true });
    }
  );
});

// Удаление процесса
app.delete('/api/processes/:id', (req, res) => {
  db.run('DELETE FROM processes WHERE id = ?', [req.params.id], function (err) {
    res.json({ success: true });
  });
});

app.listen(4000, () => console.log('Backend running on http://localhost:4000'));
