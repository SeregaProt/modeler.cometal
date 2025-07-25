const sqlite3 = require('sqlite3').verbose();

// Исправленная миграция для добавления колонок с датами
const db = new sqlite3.Database('./db.sqlite');

console.log('Fixing remaining database columns...');

db.serialize(() => {
  // Добавляем колонки с NULL по умолчанию, а затем обновляем
  db.all("PRAGMA table_info(users)", [], (err, columns) => {
    if (err) {
      console.error('Error checking users table:', err);
      return;
    }
    
    const hasCreatedAt = columns.some(col => col.name === 'created_at');
    
    if (!hasCreatedAt) {
      console.log('Adding created_at column to users...');
      db.run("ALTER TABLE users ADD COLUMN created_at DATETIME", (err) => {
        if (err) {
          console.error('Error adding created_at to users:', err);
        } else {
          // Обновляем существующие записи
          db.run("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL", (err) => {
            if (err) {
              console.error('Error updating created_at in users:', err);
            } else {
              console.log('✅ Added and updated created_at column in users');
            }
          });
        }
      });
    }
  });
  
  db.all("PRAGMA table_info(projects)", [], (err, columns) => {
    if (err) {
      console.error('Error checking projects table:', err);
      return;
    }
    
    const hasUpdatedAt = columns.some(col => col.name === 'updated_at');
    
    if (!hasUpdatedAt) {
      console.log('Adding updated_at column to projects...');
      db.run("ALTER TABLE projects ADD COLUMN updated_at DATETIME", (err) => {
        if (err) {
          console.error('Error adding updated_at to projects:', err);
        } else {
          // Обновляем существующие записи
          db.run("UPDATE projects SET updated_at = created_at WHERE updated_at IS NULL", (err) => {
            if (err) {
              console.error('Error updating updated_at in projects:', err);
            } else {
              console.log('✅ Added and updated updated_at column in projects');
            }
          });
        }
      });
    }
  });
  
  db.all("PRAGMA table_info(processes)", [], (err, columns) => {
    if (err) {
      console.error('Error checking processes table:', err);
      return;
    }
    
    const hasCreatedAt = columns.some(col => col.name === 'created_at');
    
    if (!hasCreatedAt) {
      console.log('Adding created_at column to processes...');
      db.run("ALTER TABLE processes ADD COLUMN created_at DATETIME", (err) => {
        if (err) {
          console.error('Error adding created_at to processes:', err);
        } else {
          // Обновляем существующие записи
          db.run("UPDATE processes SET created_at = updated_at WHERE created_at IS NULL", (err) => {
            if (err) {
              console.error('Error updating created_at in processes:', err);
            } else {
              console.log('✅ Added and updated created_at column in processes');
            }
          });
        }
      });
    }
  });
});

setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database fix completed!');
    }
  });
}, 2000);