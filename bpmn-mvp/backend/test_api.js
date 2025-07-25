const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Тот же секрет, что и в основном приложении
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production-min-32-chars';

// Создаем тестовый токен для Admin User
const testToken = jwt.sign(
  { id: 1, email: 'admin@example.com', role: 'admin', name: 'Admin User' },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('Testing process creation with author...');

async function testCreateProcess() {
  try {
    const response = await fetch('http://localhost:4000/api/processes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        project_id: 1,
        name: 'Тестовый процесс с автором',
        bpmn: null
      })
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', result);

    if (result.author) {
      console.log('✅ SUCCESS: Author is set to:', result.author);
    } else {
      console.log('❌ FAILED: Author not returned in response');
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('Make sure backend is running on port 4000');
  }
}

testCreateProcess();