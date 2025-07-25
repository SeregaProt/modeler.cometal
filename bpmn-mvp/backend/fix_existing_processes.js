const sqlite3 = require('sqlite3').verbose();

// Подключаемся к базе данных
const db = new sqlite3.Database('./db.sqlite');

console.log('Fixing existing processes with unknown authors...');

// Обновляем процессы с "Неизвестный автор" на "Admin User" (так как скорее всего их создал админ)
db.run(
  `UPDATE processes SET author = 'Admin User' WHERE author = 'Неизвестный автор' OR author IS NULL OR author = ''`,
  function(err) {
    if (err) {
      console.error('Error updating processes:', err);
    } else {
      console.log(`Updated ${this.changes} processes with unknown authors`);
    }
    
    // Проверяем результат
    db.all('SELECT id, name, author FROM processes', [], (err, rows) => {
      if (err) {
        console.error('Error fetching processes:', err);
      } else {
        console.log('Current processes:');
        console.table(rows);
      }
      
      db.close();
    });
  }
);