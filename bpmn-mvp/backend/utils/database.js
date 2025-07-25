const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Утилиты для работы с базой данных
 */

/**
 * Применяет индексы к базе данных
 * @param {sqlite3.Database} db - Объект базы данных
 */
const applyIndexes = (db) => {
  console.log('Applying database indexes for performance optimization...');
  
  const indexes = [
    // Индексы для users
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
    `CREATE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role)`,
    
    // Индексы для projects
    `CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_created_by_date ON projects(created_by, created_at)`,
    
    // Индексы для project_users
    `CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_project_users_project_user ON project_users(project_id, user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_project_users_role ON project_users(role)`,
    
    // Индексы для processes
    `CREATE INDEX IF NOT EXISTS idx_processes_project_id ON processes(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_processes_updated_at ON processes(updated_at)`,
    `CREATE INDEX IF NOT EXISTS idx_processes_name ON processes(name)`,
    `CREATE INDEX IF NOT EXISTS idx_processes_author ON processes(author)`,
    `CREATE INDEX IF NOT EXISTS idx_processes_project_updated ON processes(project_id, updated_at)`,
    `CREATE INDEX IF NOT EXISTS idx_processes_project_name ON processes(project_id, name)`
  ];

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let completed = 0;
      const total = indexes.length;
      
      indexes.forEach((indexSql, i) => {
        db.run(indexSql, (err) => {
          if (err) {
            console.error(`Error creating index ${i + 1}:`, err);
          } else {
            console.log(`Index ${i + 1}/${total} created successfully`);
          }
          
          completed++;
          if (completed === total) {
            console.log('All database indexes applied successfully');
            resolve();
          }
        });
      });
    });
  });
};

/**
 * Анализирует производительность запросов
 * @param {sqlite3.Database} db - Объект базы данных
 * @param {string} query - SQL запрос для анализа
 */
const analyzeQuery = (db, query) => {
  return new Promise((resolve, reject) => {
    const explainQuery = `EXPLAIN QUERY PLAN ${query}`;
    
    db.all(explainQuery, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        console.log('Query Plan Analysis:');
        console.table(rows);
        resolve(rows);
      }
    });
  });
};

/**
 * Получает статистику использования индексов
 * @param {sqlite3.Database} db - Объект базы данных
 */
const getIndexStats = (db) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        name,
        tbl_name,
        sql
      FROM sqlite_master 
      WHERE type = 'index' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `;
    
    db.all(query, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        console.log('Database Indexes:');
        console.table(rows);
        resolve(rows);
      }
    });
  });
};

/**
 * Оптимизирует базу данных
 * @param {sqlite3.Database} db - Объект базы данных
 */
const optimizeDatabase = (db) => {
  return new Promise((resolve, reject) => {
    console.log('Optimizing database...');
    
    db.serialize(() => {
      // VACUUM - дефрагментация и сжатие БД
      db.run('VACUUM', (err) => {
        if (err) {
          console.error('Error during VACUUM:', err);
        } else {
          console.log('Database VACUUM completed');
        }
      });
      
      // ANALYZE - обновление статистики для оптимизатора запросов
      db.run('ANALYZE', (err) => {
        if (err) {
          console.error('Error during ANALYZE:', err);
          reject(err);
        } else {
          console.log('Database ANALYZE completed');
          resolve();
        }
      });
    });
  });
};

/**
 * Проверяет целостность базы данных
 * @param {sqlite3.Database} db - Объект базы данных
 */
const checkIntegrity = (db) => {
  return new Promise((resolve, reject) => {
    db.get('PRAGMA integrity_check', (err, row) => {
      if (err) {
        reject(err);
      } else {
        const isOk = row['integrity_check'] === 'ok';
        console.log('Database integrity check:', isOk ? 'PASSED' : 'FAILED');
        resolve(isOk);
      }
    });
  });
};

/**
 * Получает размер базы данных
 * @param {sqlite3.Database} db - Объект базы данных
 */
const getDatabaseSize = (db) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        page_count * page_size as size_bytes,
        page_count,
        page_size
      FROM pragma_page_count(), pragma_page_size()
    `;
    
    db.get(query, (err, row) => {
      if (err) {
        reject(err);
      } else {
        const sizeKB = Math.round(row.size_bytes / 1024);
        const sizeMB = Math.round(sizeKB / 1024 * 100) / 100;
        
        console.log(`Database size: ${sizeMB} MB (${sizeKB} KB, ${row.size_bytes} bytes)`);
        console.log(`Pages: ${row.page_count}, Page size: ${row.page_size} bytes`);
        
        resolve({
          bytes: row.size_bytes,
          kilobytes: sizeKB,
          megabytes: sizeMB,
          pageCount: row.page_count,
          pageSize: row.page_size
        });
      }
    });
  });
};

module.exports = {
  applyIndexes,
  analyzeQuery,
  getIndexStats,
  optimizeDatabase,
  checkIntegrity,
  getDatabaseSize
};