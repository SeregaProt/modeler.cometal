const { validate, validateId, schemas } = require('../middleware/validation');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent')
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('User Registration Validation', () => {
    const registerValidator = validate('register');

    test('should pass with valid registration data', () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      registerValidator(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail with invalid email', () => {
      req.body = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123'
      };

      registerValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('email')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail with short password', () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: '123'
      };

      registerValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('6 символов')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail with missing name', () => {
      req.body = {
        email: 'john@example.com',
        password: 'password123'
      };

      registerValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('обязательно')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should strip unknown fields', () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        unknownField: 'should be removed'
      };

      registerValidator(req, res, next);

      expect(req.body).not.toHaveProperty('unknownField');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Login Validation', () => {
    const loginValidator = validate('login');

    test('should pass with valid login data', () => {
      req.body = {
        email: 'john@example.com',
        password: 'password123'
      };

      loginValidator(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail with invalid email format', () => {
      req.body = {
        email: 'not-an-email',
        password: 'password123'
      };

      loginValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail with missing password', () => {
      req.body = {
        email: 'john@example.com'
      };

      loginValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Project Creation Validation', () => {
    const projectValidator = validate('createProject');

    test('should pass with valid project data', () => {
      req.body = {
        name: 'Test Project',
        description: 'A test project'
      };

      projectValidator(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should pass with empty description', () => {
      req.body = {
        name: 'Test Project',
        description: ''
      };

      projectValidator(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should fail with empty name', () => {
      req.body = {
        name: '',
        description: 'A test project'
      };

      projectValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail with name too long', () => {
      req.body = {
        name: 'A'.repeat(101), // 101 characters
        description: 'A test project'
      };

      projectValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail with description too long', () => {
      req.body = {
        name: 'Test Project',
        description: 'A'.repeat(501) // 501 characters
      };

      projectValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('ID Validation', () => {
    const idValidator = validateId();

    test('should pass with valid numeric ID', () => {
      req.params.id = '123';

      idValidator(req, res, next);

      expect(req.params.id).toBe(123);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail with non-numeric ID', () => {
      req.params.id = 'abc';

      idValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('ID')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail with negative ID', () => {
      req.params.id = '-1';

      idValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail with zero ID', () => {
      req.params.id = '0';

      idValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should work with custom parameter name', () => {
      const customValidator = validateId('projectId');
      req.params.projectId = '456';

      customValidator(req, res, next);

      expect(req.params.projectId).toBe(456);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Process Validation', () => {
    const createProcessValidator = validate('createProcess');
    const updateProcessValidator = validate('updateProcess');

    test('should pass with valid process creation data', () => {
      req.body = {
        name: 'Test Process',
        project_id: 1
      };

      createProcessValidator(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail with missing project_id', () => {
      req.body = {
        name: 'Test Process'
      };

      createProcessValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should pass with valid process update data', () => {
      req.body = {
        name: 'Updated Process Name',
        bpmn: '<xml>...</xml>'
      };

      updateProcessValidator(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail with empty update data', () => {
      req.body = {};

      updateProcessValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent schema gracefully', () => {
      const invalidValidator = validate('nonExistentSchema');
      
      invalidValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Внутренняя ошибка сервера'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should return detailed validation errors', () => {
      const registerValidator = validate('register');
      req.body = {
        name: 'A', // Too short
        email: 'invalid-email',
        password: '123' // Too short
      };

      registerValidator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: expect.any(String),
              message: expect.any(String)
            })
          ])
        })
      );
    });
  });
});