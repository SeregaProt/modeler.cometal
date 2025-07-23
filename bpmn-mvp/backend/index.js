const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Инициализация БД
const db = new sqlite3.Database('./db.sqlite');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, email TEXT, name TEXT, role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY, name TEXT, description TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS project_users (
    id INTEGER PRIMARY KEY, project_id INTEGER, user_id INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS processes (
    id INTEGER PRIMARY KEY,
    project_id INTEGER,
    name TEXT,
    bpmn TEXT,
    author TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Пользователи
app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => res.json(rows));
});

app.post('/api/users', (req, res) => {
  const { email, name, role } = req.body;
  db.run('INSERT INTO users (email, name, role) VALUES (?, ?, ?)', [email, name, role], function (err) {
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
