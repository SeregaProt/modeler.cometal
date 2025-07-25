const jwt = require('jsonwebtoken');

// Тот же секрет, что и в основном приложении
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production-min-32-chars';

// Создаем тестовый токен для Admin User
const testToken = jwt.sign(
  { id: 1, email: 'admin@example.com', role: 'admin', name: 'Admin User' },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('Test token created:', testToken);

// Тестируем создание процесса
const testData = {
  project_id: 1,
  name: 'Тестовый процесс с автором',
  bpmn: null
};

console.log('Test data:', testData);

// Выводим curl команду для тестирования
console.log('\nCurl command to test:');
console.log(`curl -X POST http://localhost:4000/api/processes \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${testToken}" \\
  -d '${JSON.stringify(testData)}'`);

console.log('\nExpected result: Process should be created with author "Admin User"');