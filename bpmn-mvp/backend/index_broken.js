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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`);

  // Создаем таблицу для связей процессов (ER-диаграмма)
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

// Проекты (требует аутентификации) с пагинацией
app.get('/api/projects', authenticateToken, paginate({ defaultLimit: 10, maxLimit: 50 }), async (req, res) => {
  const { limit, offset } = req.pagination;
  
  try {
    // Определяем запросы в зависимости от роли пользователя
    let countQuery, dataQuery, countParams, dataParams;
    
    if (req.user.role === 'admin') {
      countQuery = 'SELECT COUNT(*) as total FROM projects';
      dataQuery = `
        SELECT p.*, u.name as creator_name,
               COUNT(DISTINCT pu.user_id) as user_count,
               COUNT(DISTINCT pr.id) as process_count
        FROM projects p 
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN project_users pu ON p.id = pu.project_id
        LEFT JOIN processes pr ON p.id = pr.project_id
        GROUP BY p.id
        ORDER BY p.created_at DESC 
        LIMIT ? OFFSET ?
      `;
      countParams = [];
      dataParams = [limit, offset];
    } else {
      countQuery = `
        SELECT COUNT(DISTINCT p.id) as total 
        FROM projects p 
        LEFT JOIN project_users pu ON p.id = pu.project_id 
        WHERE pu.user_id = ? OR p.created_by = ?
      `;
      dataQuery = `
        SELECT p.*, u.name as creator_name,
               COUNT(DISTINCT pu.user_id) as user_count,
               COUNT(DISTINCT pr.id) as process_count
        FROM projects p 
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN project_users pu ON p.id = pu.project_id
        LEFT JOIN processes pr ON p.id = pr.project_id
        WHERE pu.user_id = ? OR p.created_by = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC 
        LIMIT ? OFFSET ?
      `;
      countParams = [req.user.id, req.user.id];
      dataParams = [req.user.id, req.user.id, limit, offset];
    }

    const { total, data } = await executePaginatedQuery(db, countQuery, dataQuery, countParams, dataParams);
    const response = createPaginatedResponse(data, total, req.pagination);
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Database error' });
  }
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

// Получение всех процессов проекта с пагинацией (требует аутентификации)
app.get('/api/projects/:id/processes', authenticateToken, paginate({ defaultLimit: 20, maxLimit: 100 }), async (req, res) => {
  const { limit, offset } = req.pagination;
  const projectId = req.params.id;
  
  try {
    const countQuery = 'SELECT COUNT(*) as total FROM processes WHERE project_id = ?';
    const dataQuery = `
      SELECT id, project_id, name, author, updated_at, 
             CASE WHEN bpmn IS NOT NULL AND bpmn != '' THEN 1 ELSE 0 END as has_diagram
      FROM processes 
      WHERE project_id = ? 
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `;
    
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
    `INSERT INTO processes (project_id, name, bpmn, author, updated_at) VALUES (?, ?, ?, ?, datetime('now'))`,
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

// --- API: update process position (должен быть выше общих маршрутов /api/processes/:id) ---
app.put('/api/processes/:id/position', authenticateToken, (req, res) => {
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
        console.error('Error updating process position:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Process not found' });
      }
      res.json({ success: true });
    }
  );
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
    // Ес��и переданы и название, и BPMN диаграмма
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
  const processId = req.params.id;
  
  // Начинаем транзакцию для удаления процесса и всех его связей
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Удаляем все связи процесса
    db.run('DELETE FROM process_relations WHERE from_process_id = ? OR to_process_id = ?', [processId, processId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to delete process relations' });
      }
      
      // Удаляем сам процесс
      db.run('DELETE FROM processes WHERE id = ?', [processId], function (err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Database error' });
        }
        
        db.run('COMMIT');
        res.json({ success: true });
      });
    });
  });
});

// --- API endpoints для связей процессов (ER-диаграмма) ---

// Получить все связи для проекта
app.get('/api/projects/:id/process-relations', authenticateToken, (req, res) => {
  db.all(
    `SELECT * FROM process_relations WHERE project_id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err) {
        console.error('Error fetching process relations:', err);
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
        return res.status(400).json({ error: 'Связь уже существует' });
      }
      
      db.run(
        `INSERT INTO process_relations (project_id, from_process_id, to_process_id, relation_type) VALUES (?, ?, ?, ?)`,
        [project_id, from_process_id, to_process_id, relation_type || 'one-to-one'],
        function (err) {
          if (err) {
            console.error('Error creating process relation:', err);
            return res.status(500).json({ error: 'Ошибка создания связи процессов' });
          }
          res.status(201).json({ id: this.lastID });
        }
      );
    }
  );
});

// Удалить связь
app.delete('/api/process-relations/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM process_relations WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      console.error('Error deleting process relation:', err);
      return res.status(500).json({ error: 'Ошибка удаления связи процессов' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Связь не найдена' });
    }
    res.json({ success: true });
  });
});

// Удаление проекта (требует аутентификации)
app.delete('/api/projects/:id', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  
  // Начинаем транзак��ию для удаления проекта и всех связанных данных
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Удаляем все процессы проекта
    db.run('DELETE FROM processes WHERE project_id = ?', [projectId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to delete processes' });
      }
      
      // Удаляем связи пользователей с проектом
      db.run('DELETE FROM project_users WHERE project_id = ?', [projectId], (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to delete project users' });
        }
        
        // Удаляем сам проект
        db.run('DELETE FROM projects WHERE id = ?', [projectId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to delete project' });
          }
          
          if (this.changes === 0) {
            db.run('ROLLBACK');
            return res.status(404).json({ error: 'Project not found' });
          }
          
          db.run('COMMIT');
          res.json({ success: true, message: 'Project and all related data deleted successfully' });
        });
      });
    });
  });
});

// --- API endpoints для коннекторов согласно ТЗ №1 ---

// Получить все элементы доски (BoardItems) для проекта
app.get('/api/boards/:boardId/items', authenticateToken, (req, res) => {
  const boardId = req.params.boardId;
  
  db.all(
    'SELECT * FROM board_items WHERE board_id = ? ORDER BY updated_at DESC',
    [boardId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching board items:', err);
        return res.status(500).json({ error: 'Ошибка получения элементов доски' });
      }
      res.json(rows);
    }
  );
});

// Создать новый элемент доски (BoardItem)
app.post('/api/board-items', authenticateToken, (req, res) => {
  const { id, board_id, type, name, data, position_x, position_y } = req.body;
  
  if (!id || !board_id || !type) {
    return res.status(400).json({ error: 'id, board_id, type обязательны' });
  }
  
  db.run(
    `INSERT INTO board_items (id, board_id, type, name, data, position_x, position_y, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, board_id, type, name, data, position_x, position_y],
    function (err) {
      if (err) {
        console.error('Error creating board item:', err);
        return res.status(500).json({ error: 'Ошибка создания элемента доски' });
      }
      res.status(201).json({ id: id });
    }
  );
});

// Обновить элемент доски (BoardItem)
app.put('/api/board-items/:id', authenticateToken, (req, res) => {
  const { name, data, position_x, position_y } = req.body;
  const itemId = req.params.id;
  
  let updates = [];
  let params = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (data !== undefined) {
    updates.push('data = ?');
    params.push(data);
  }
  if (position_x !== undefined) {
    updates.push('position_x = ?');
    params.push(position_x);
  }
  if (position_y !== undefined) {
    updates.push('position_y = ?');
    params.push(position_y);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'Нет данных для обновления' });
  }
  
  updates.push('updated_at = datetime(\'now\')');
  params.push(itemId);
  
  const query = `UPDATE board_items SET ${updates.join(', ')} WHERE id = ?`;
  
  db.run(query, params, function (err) {
    if (err) {
      console.error('Error updating board item:', err);
      return res.status(500).json({ error: 'Ошибка обновления элемента доски' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Элемент доски не найден' });
    }
    res.json({ success: true });
  });
});

// Удалить элемент доски (BoardItem) - автоматически удалит связанные коннекторы благод��ря CASCADE
app.delete('/api/board-items/:id', authenticateToken, (req, res) => {
  const itemId = req.params.id;
  
  db.run('DELETE FROM board_items WHERE id = ?', [itemId], function (err) {
    if (err) {
      console.error('Error deleting board item:', err);
      return res.status(500).json({ error: 'Ошибка удаления элемента доски' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Элемент доски не найден' });
    }
    res.json({ success: true });
  });
});

// Получить все коннекторы для доски с пагинацией (НФ-требование: ≤ 50 мс на 1000 коннекторов)
app.get('/api/boards/:boardId/connectors', authenticateToken, paginate({ defaultLimit: 1000, maxLimit: 1000 }), async (req, res) => {
  const { limit, offset } = req.pagination;
  const boardId = req.params.boardId;
  
  try {
    const startTime = Date.now();
    
    const countQuery = 'SELECT COUNT(*) as total FROM connectors WHERE board_id = ?';
    const dataQuery = `
      SELECT c.*, 
             si.name as start_item_name, si.type as start_item_type,
             ei.name as end_item_name, ei.type as end_item_type
      FROM connectors c
      LEFT JOIN board_items si ON c.start_item_id = si.id
      LEFT JOIN board_items ei ON c.end_item_id = ei.id
      WHERE c.board_id = ? 
      ORDER BY c.updated_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const countParams = [boardId];
    const dataParams = [boardId, limit, offset];
    
    const { total, data } = await executePaginatedQuery(db, countQuery, dataQuery, countParams, dataParams);
    const response = createPaginatedResponse(data, total, req.pagination);
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    // Логируем производительность согласно НФ-требованию
    console.log(`Connectors query time: ${queryTime}ms for ${data.length} connectors`);
    
    if (queryTime > 50 && data.length >= 1000) {
      console.warn(`⚠️ НФ-требование нарушено: запрос 1000 коннекторов занял ${queryTime}ms (требуется ≤ 50ms)`);
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching connectors:', error);
    res.status(500).json({ error: 'Ошибка получения коннекторов' });
  }
});

// Создать новый коннектор согласно ТЗ
app.post('/api/connectors', authenticateToken, (req, res) => {
  const { id, board_id, start_item_id, end_item_id, shape, style, captions } = req.body;
  
  if (!id || !board_id || !start_item_id || !end_item_id) {
    return res.status(400).json({ error: 'id, board_id, start_item_id, end_item_id обязательны' });
  }
  
  // Проверяем инвариант: startItemId ≠ endItemId (self-loop не поддерживаем в R1)
  if (start_item_id === end_item_id) {
    return res.status(400).json({ error: 'Self-loop не поддерживается (start_item_id не может равняться end_item_id)' });
  }
  
  // Проверяем, что элементы существуют
  db.get('SELECT id FROM board_items WHERE id = ?', [start_item_id], (err, startItem) => {
    if (err || !startItem) {
      return res.status(400).json({ error: 'Начальный элемент не найден' });
    }
    
    db.get('SELECT id FROM board_items WHERE id = ?', [end_item_id], (err, endItem) => {
      if (err || !endItem) {
        return res.status(400).json({ error: 'Конечный элемент не найден' });
      }
      
      // Создаем коннектор
      db.run(
        `INSERT INTO connectors (id, board_id, start_item_id, end_item_id, shape, style, captions, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [id, board_id, start_item_id, end_item_id, shape || 'curved', style, captions],
        function (err) {
          if (err) {
            console.error('Error creating connector:', err);
            return res.status(500).json({ error: 'Ошибка создания коннектора' });
          }
          res.status(201).json({ id: id });
        }
      );
    });
  });
});

// Обновить коннектор
app.put('/api/connectors/:id', authenticateToken, (req, res) => {
  const { shape, style, captions } = req.body;
  const connectorId = req.params.id;
  
  let updates = [];
  let params = [];
  
  if (shape !== undefined) {
    if (!['straight', 'elbowed', 'curved'].includes(shape)) {
      return res.status(400).json({ error: 'shape должен быть одним из: straight, elbowed, curved' });
    }
    updates.push('shape = ?');
    params.push(shape);
  }
  if (style !== undefined) {
    updates.push('style = ?');
    params.push(style);
  }
  if (captions !== undefined) {
    updates.push('captions = ?');
    params.push(captions);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'Нет данных для обновления' });
  }
  
  updates.push('updated_at = datetime(\'now\')');
  params.push(connectorId);
  
  const query = `UPDATE connectors SET ${updates.join(', ')} WHERE id = ?`;
  
  db.run(query, params, function (err) {
    if (err) {
      console.error('Error updating connector:', err);
      return res.status(500).json({ error: 'Ошибка обновления коннектора' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Коннектор не найден' });
    }
    res.json({ success: true });
  });
});

// Удалить коннектор
app.delete('/api/connectors/:id', authenticateToken, (req, res) => {
  const connectorId = req.params.id;
  
  db.run('DELETE FROM connectors WHERE id = ?', [connectorId], function (err) {
    if (err) {
      console.error('Error deleting connector:', err);
      return res.status(500).json({ error: 'Ошибка удаления коннектора' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Коннектор не найден' });
    }
    res.json({ success: true });
  });
});

// --- MIGRATION: add position_x, position_y columns if not exist ---
db.run(`ALTER TABLE processes ADD COLUMN position_x REAL DEFAULT NULL`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding position_x column:', err);
  }
});
db.run(`ALTER TABLE processes ADD COLUMN position_y REAL DEFAULT NULL`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding position_y column:', err);
  }
});


app.listen(4000, () => {
  console.log('Backend running on http://localhost:4000');
  console.log('JWT Secret length:', JWT_SECRET.length);
});