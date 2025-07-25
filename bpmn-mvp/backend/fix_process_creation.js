// Исправленный endpoint для создания процесса
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