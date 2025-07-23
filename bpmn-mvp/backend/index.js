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
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT, name TEXT, role TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY, name TEXT, description TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS project_users (id INTEGER PRIMARY KEY, project_id INTEGER, user_id INTEGER)');
  db.run('CREATE TABLE IF NOT EXISTS processes (id INTEGER PRIMARY KEY, project_id INTEGER, name TEXT, bpmn TEXT)');
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

// Назначение пользователя на проект
app.post('/api/project-users', (req, res) => {
  const { project_id, user_id } = req.body;
  db.run('INSERT INTO project_users (project_id, user_id) VALUES (?, ?)', [project_id, user_id], function (err) {
    res.json({ id: this.lastID });
  });
});
// Получение пользователей проекта
app.get('/api/projects/:id/users', (req, res) => {
  db.all(
    'SELECT users.* FROM users JOIN project_users ON users.id = project_users.user_id WHERE project_users.project_id = ?',
    [req.params.id],
    (err, rows) => res.json(rows)
  );
});

// Процессы
app.get('/api/projects/:id/processes', (req, res) => {
  db.all('SELECT * FROM processes WHERE project_id = ?', [req.params.id], (err, rows) => res.json(rows));
});
app.post('/api/processes', (req, res) => {
  const { project_id, name, bpmn } = req.body;
  db.run('INSERT INTO processes (project_id, name, bpmn) VALUES (?, ?, ?)', [project_id, name, bpmn], function (err) {
    res.json({ id: this.lastID });
  });
});
app.get('/api/processes/:id', (req, res) => {
  db.get('SELECT * FROM processes WHERE id = ?', [req.params.id], (err, row) => res.json(row));
});
app.put('/api/processes/:id', (req, res) => {
  const { bpmn } = req.body;
  db.run('UPDATE processes SET bpmn = ? WHERE id = ?', [bpmn, req.params.id], function (err) {
    res.json({ success: true });
  });
});

app.listen(4000, () => console.log('Backend running on http://localhost:4000'));
