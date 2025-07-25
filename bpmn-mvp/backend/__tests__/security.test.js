const { sanitizeInput, securityLogger } = require('../middleware/security');

describe('Security Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      path: '/test',
      method: 'GET',
      get: jest.fn().mockReturnValue('test-user-agent'),
      user: { id: 1, email: 'test@example.com' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('Input Sanitization', () => {
    test('should remove script tags from body', () => {
      req.body = {
        name: 'Test<script>alert("xss")</script>Name',
        description: 'Safe description'
      };

      sanitizeInput(req, res, next);

      expect(req.body.name).toBe('TestName');
      expect(req.body.description).toBe('Safe description');
      expect(next).toHaveBeenCalled();
    });

    test('should remove javascript: protocols', () => {
      req.body = {
        url: 'javascript:alert("xss")',
        link: 'https://example.com'
      };

      sanitizeInput(req, res, next);

      expect(req.body.url).toBe('alert("xss")');
      expect(req.body.link).toBe('https://example.com');
      expect(next).toHaveBeenCalled();
    });

    test('should remove event handlers', () => {
      req.body = {
        content: 'Hello <div onclick="alert()">World</div>',
        safe: 'Normal content'
      };

      sanitizeInput(req, res, next);

      expect(req.body.content).toBe('Hello <div>World</div>');
      expect(req.body.safe).toBe('Normal content');
      expect(next).toHaveBeenCalled();
    });

    test('should sanitize nested objects', () => {
      req.body = {
        user: {
          name: 'Test<script>alert()</script>',
          profile: {
            bio: 'Bio<script>evil()</script>content'
          }
        }
      };

      sanitizeInput(req, res, next);

      expect(req.body.user.name).toBe('Test');
      expect(req.body.user.profile.bio).toBe('Biocontent');
      expect(next).toHaveBeenCalled();
    });

    test('should sanitize query parameters', () => {
      req.query = {
        search: 'term<script>alert()</script>',
        filter: 'safe'
      };

      sanitizeInput(req, res, next);

      expect(req.query.search).toBe('term');
      expect(req.query.filter).toBe('safe');
      expect(next).toHaveBeenCalled();
    });

    test('should sanitize URL parameters', () => {
      req.params = {
        id: '123<script>alert()</script>',
        name: 'test'
      };

      sanitizeInput(req, res, next);

      expect(req.params.id).toBe('123');
      expect(req.params.name).toBe('test');
      expect(next).toHaveBeenCalled();
    });

    test('should handle null and undefined values', () => {
      req.body = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        normalString: 'test'
      };

      sanitizeInput(req, res, next);

      expect(req.body.nullValue).toBeNull();
      expect(req.body.undefinedValue).toBeUndefined();
      expect(req.body.emptyString).toBe('');
      expect(req.body.normalString).toBe('test');
      expect(next).toHaveBeenCalled();
    });

    test('should handle arrays', () => {
      req.body = {
        tags: ['safe', 'tag<script>alert()</script>', 'another'],
        numbers: [1, 2, 3]
      };

      sanitizeInput(req, res, next);

      expect(req.body.tags).toEqual(['safe', 'tag', 'another']);
      expect(req.body.numbers).toEqual([1, 2, 3]);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Security Logger', () => {
    test('should log authentication attempts', () => {
      req.path = '/api/auth/login';
      const loggerSpy = jest.spyOn(require('../config/logger'), 'info');

      securityLogger(req, res, next);

      expect(loggerSpy).toHaveBeenCalledWith('Authentication attempt:', expect.objectContaining({
        ip: '127.0.0.1',
        userAgent: 'test-user-agent',
        path: '/api/auth/login',
        method: 'GET'
      }));
      expect(next).toHaveBeenCalled();

      loggerSpy.mockRestore();
    });

    test('should log admin access attempts', () => {
      req.path = '/api/admin/users';
      const loggerSpy = jest.spyOn(require('../config/logger'), 'info');

      securityLogger(req, res, next);

      expect(loggerSpy).toHaveBeenCalledWith('Admin access attempt:', expect.objectContaining({
        ip: '127.0.0.1',
        userAgent: 'test-user-agent',
        path: '/api/admin/users',
        method: 'GET',
        user: 1
      }));
      expect(next).toHaveBeenCalled();

      loggerSpy.mockRestore();
    });

    test('should log admin access for anonymous users', () => {
      req.path = '/api/users';
      req.user = undefined;
      const loggerSpy = jest.spyOn(require('../config/logger'), 'info');

      securityLogger(req, res, next);

      expect(loggerSpy).toHaveBeenCalledWith('Admin access attempt:', expect.objectContaining({
        user: 'anonymous'
      }));
      expect(next).toHaveBeenCalled();

      loggerSpy.mockRestore();
    });

    test('should not log regular requests', () => {
      req.path = '/api/projects';
      const loggerSpy = jest.spyOn(require('../config/logger'), 'info');

      securityLogger(req, res, next);

      expect(loggerSpy).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();

      loggerSpy.mockRestore();
    });
  });

  describe('Complex XSS Scenarios', () => {
    test('should handle complex script injection attempts', () => {
      req.body = {
        content: `
          <img src="x" onerror="alert('xss')">
          <svg onload="alert('xss')">
          <iframe src="javascript:alert('xss')"></iframe>
          <script type="text/javascript">alert('xss')</script>
          <SCRIPT>alert('XSS')</SCRIPT>
        `
      };

      sanitizeInput(req, res, next);

      expect(req.body.content).not.toContain('alert');
      expect(req.body.content).not.toContain('javascript:');
      expect(req.body.content).not.toContain('<script');
      expect(req.body.content).not.toContain('onerror');
      expect(req.body.content).not.toContain('onload');
      expect(next).toHaveBeenCalled();
    });

    test('should preserve safe HTML content', () => {
      req.body = {
        content: `
          <div class="container">
            <h1>Title</h1>
            <p>Paragraph with <strong>bold</strong> text</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        `
      };

      const originalContent = req.body.content;
      sanitizeInput(req, res, next);

      // Should preserve basic HTML structure
      expect(req.body.content).toContain('<div class="container">');
      expect(req.body.content).toContain('<h1>Title</h1>');
      expect(req.body.content).toContain('<strong>bold</strong>');
      expect(next).toHaveBeenCalled();
    });
  });
});