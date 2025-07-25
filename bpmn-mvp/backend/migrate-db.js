const sqlite3 = require('sqlite3').verbose();

// Скрипт для миграции базы данных
const db = new sqlite3.Database('./db.sqlite');

console.log('Starting database migration...');

db.serialize(() => {
  // Проверяем, существует ли колонка is_active
  db.all("PRAGMA table_info(users)", [], (err, columns) => {
    if (err) {
      console.error('Error checking table structure:', err);
      return;
    }
    
    const hasIsActive = columns.some(col => col.name === 'is_active');
    const hasLastLogin = columns.some(col => col.name === 'last_login');
    const hasCreatedAt = columns.some(col => col.name === 'created_at');
    
    console.log('Current users table columns:', columns.map(c => c.name));
    
    // Добавляем недостающие колонки
    if (!hasIsActive) {
      console.log('Adding is_active column...');
      db.run("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1", (err) => {
        if (err) {
          console.error('Error adding is_active column:', err);
        } else {
          console.log('✅ Added is_active column');
        }
      });
    } else {
      console.log('✅ is_active column already exists');
    }
    
    if (!hasLastLogin) {
      console.log('Adding last_login column...');
      db.run("ALTER TABLE users ADD COLUMN last_login DATETIME", (err) => {
        if (err) {
          console.error('Error adding last_login column:', err);
        } else {
          console.log('✅ Added last_login column');
        }
      });
    } else {
      console.log('✅ last_login column already exists');
    }
    
    if (!hasCreatedAt) {
      console.log('Adding created_at column to users...');
      db.run("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
        if (err) {
          console.error('Error adding created_at column to users:', err);
        } else {
          console.log('✅ Added created_at column to users');
        }
      });
    } else {
      console.log('✅ created_at column already exists in users');
    }
  });
  
  // Проверяем и обновляем таблицу projects
  db.all("PRAGMA table_info(projects)", [], (err, columns) => {
    if (err) {
      console.error('Error checking projects table structure:', err);
      return;
    }
    
    const hasUpdatedAt = columns.some(col => col.name === 'updated_at');
    
    if (!hasUpdatedAt) {
      console.log('Adding updated_at column to projects...');
      db.run("ALTER TABLE projects ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
        if (err) {
          console.error('Error adding updated_at column to projects:', err);
        } else {
          console.log('✅ Added updated_at column to projects');
        }
      });
    } else {
      console.log('✅ updated_at column already exists in projects');
    }
  });
  
  // Проверяем и обновляем таблицу processes
  db.all("PRAGMA table_info(processes)", [], (err, columns) => {
    if (err) {
      console.error('Error checking processes table structure:', err);
      return;
    }
    
    const hasCreatedAt = columns.some(col => col.name === 'created_at');
    const hasVersion = columns.some(col => col.name === 'version');
    
    if (!hasCreatedAt) {
      console.log('Adding created_at column to processes...');
      db.run("ALTER TABLE processes ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
        if (err) {
          console.error('Error adding created_at column to processes:', err);
        } else {
          console.log('✅ Added created_at column to processes');
        }
      });
    } else {
      console.log('✅ created_at column already exists in processes');
    }
    
    if (!hasVersion) {
      console.log('Adding version column to processes...');
      db.run("ALTER TABLE processes ADD COLUMN version INTEGER DEFAULT 1", (err) => {
        if (err) {
          console.error('Error adding version column to processes:', err);
        } else {
          console.log('✅ Added version column to processes');
        }
      });
    } else {
      console.log('✅ version column already exists in processes');
    }
  });
  
  // Проверяем и обновляем таблицу project_users
  db.all("PRAGMA table_info(project_users)", [], (err, columns) => {
    if (err) {
      console.error('Error checking project_users table structure:', err);
      return;
    }
    
    const hasAssignedAt = columns.some(col => col.name === 'assigned_at');
    
    if (!hasAssignedAt) {
      console.log('Adding assigned_at column to project_users...');
      db.run("ALTER TABLE project_users ADD COLUMN assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
        if (err) {
          console.error('Error adding assigned_at column to project_users:', err);
        } else {
          console.log('✅ Added assigned_at column to project_users');
        }
      });
    } else {
      console.log('✅ assigned_at column already exists in project_users');
    }
  });
});

// Закрываем соединение через 2 секунды
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database migration completed successfully!');
      console.log('You can now restart your server.');
    }
  });
}, 2000);