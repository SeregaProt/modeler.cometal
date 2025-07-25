const request = require('supertest');
const app = require('../index');

describe('Projects Endpoints', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create and login a test user
    const userData = {
      name: 'Project Test User',
      email: `projecttest${Date.now()}@example.com`,
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.token;
    testUser = registerResponse.body.user;
  });

  describe('GET /api/projects', () => {
    test('should get projects for authenticated user', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should not get projects without authentication', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should not get projects with invalid token', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/projects', () => {
    test('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project for unit testing'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(projectData.name);
      expect(response.body.description).toBe(projectData.description);
      expect(response.body.created_by).toBe(testUser.id);
    });

    test('should not create project without name', async () => {
      const projectData = {
        description: 'A project without name'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should not create project without authentication', async () => {
      const projectData = {
        name: 'Unauthorized Project',
        description: 'This should fail'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should not create project with name too long', async () => {
      const projectData = {
        name: 'A'.repeat(256), // Very long name
        description: 'Valid description'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/projects/:id/users', () => {
    let testProject;

    beforeAll(async () => {
      // Create a test project
      const projectData = {
        name: 'Users Test Project',
        description: 'Project for testing user endpoints'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      testProject = response.body;
    });

    test('should get project users', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject.id}/users`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Creator should be in the list
      expect(response.body.some(user => user.id === testUser.id)).toBe(true);
    });

    test('should not get users for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/99999/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});