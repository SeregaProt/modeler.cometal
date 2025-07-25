# 🔧 Исправления логики приложения

## 1. Безопасная обработка массивов

### Проблема
Компоненты падают, если API возвращает не массив.

### Решение - Utility функция
```javascript
// frontend/src/utils/arrayHelpers.js
export const ensureArray = (data) => {
  return Array.isArray(data) ? data : [];
};

export const safeFilter = (array, filterFn) => {
  const safeArray = ensureArray(array);
  return safeArray.filter(filterFn);
};

export const safeMap = (array, mapFn) => {
  const safeArray = ensureArray(array);
  return safeArray.map(mapFn);
};
```

### Применение в компонентах
```javascript
// frontend/src/ProjectPage.js
import { ensureArray, safeFilter } from './utils/arrayHelpers';

// Заменить:
const filteredProcesses = processes.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

// На:
const filteredProcesses = safeFilter(processes, p => 
  p.name.toLowerCase().includes(search.toLowerCase())
);
```

## 2. Централизованная обработка API

### API Service
```javascript
// frontend/src/services/api.js
import { getValidToken, clearInvalidToken } from '../utils/auth';

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
  }

  async request(endpoint, options = {}) {
    const token = getValidToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (response.status === 401 || response.status === 403) {
        clearInvalidToken();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Project methods
  async getProjects() {
    return this.request('/api/projects');
  }

  async createProject(projectData) {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async getProjectUsers(projectId) {
    return this.request(`/api/projects/${projectId}/users`);
  }

  // Process methods
  async getProcesses(projectId) {
    return this.request(`/api/projects/${projectId}/processes`);
  }

  async createProcess(processData) {
    return this.request('/api/processes', {
      method: 'POST',
      body: JSON.stringify(processData),
    });
  }

  async getProcess(processId) {
    return this.request(`/api/processes/${processId}`);
  }

  async updateProcess(processId, processData) {
    return this.request(`/api/processes/${processId}`, {
      method: 'PUT',
      body: JSON.stringify(processData),
    });
  }

  async deleteProcess(processId) {
    return this.request(`/api/processes/${processId}`, {
      method: 'DELETE',
    });
  }

  // User methods
  async getUsers() {
    return this.request('/api/users');
  }

  async createUser(userData) {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async assignUserToProject(projectId, userId) {
    return this.request('/api/project-users', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, user_id: userId }),
    });
  }
}

export default new ApiService();
```

## 3. Исправление утечки памяти в ProcessEditor

### Проблема
useEffect с зависимостью autoSave пересоздает интервал при каждом изменении.

### Решение
```javascript
// frontend/src/ProcessEditor.js
import React, { useEffect, useRef, useState, useCallback } from "react";

export default function ProcessEditor({ processId, goBack, user }) {
  const canvasRef = useRef();
  const modeler = useRef();
  const autoSaveInterval = useRef();
  const [process, setProcess] = useState({ name: '', author: '' });
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Стабильная функция автосохранения
  const autoSave = useCallback(async () => {
    if (!modeler.current || isAutoSaving) return;

    setIsAutoSaving(true);
    
    try {
      const xml = await new Promise((resolve, reject) => {
        modeler.current.saveXML({ format: true }, (err, xml) => {
          if (err) reject(err);
          else resolve(xml);
        });
      });

      await apiService.updateProcess(processId, { bpmn: xml });
      setLastAutoSave(new Date());
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [processId, isAutoSaving]); // Убрали лишние зависимости

  useEffect(() => {
    // Создаем модельер
    modeler.current = new BpmnModeler({
      container: canvasRef.current,
      keyboard: { bindTo: document }
    });
    
    fetchProcess();

    // Настраиваем автосохранение только один раз
    autoSaveInterval.current = setInterval(() => {
      autoSave();
    }, 30000);

    return () => {
      // Очистка ресурсов
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
      if (modeler.current) {
        modeler.current.destroy();
      }
    };
  }, [processId]); // Только processId в зависимостях

  // Остальной код...
}
```

## 4. Улучшенная обработка ошибок

### Error Boundary компонент
```javascript
// frontend/src/components/ErrorBoundary.js
import React from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Логирование ошибки
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Произошла ошибка
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Что-то пошло не так. Попробуйте перезагрузить страницу.
            </Typography>
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: 16, textAlign: 'left' }}>
                <summary>Детали ошибки (только для разработки)</summary>
                <pre style={{ fontSize: 12, overflow: 'auto' }}>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </Alert>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={this.handleReload}
          >
            Перезагрузить страницу
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Использование Error Boundary
```javascript
// frontend/src/App.js
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        {/* Остальной код приложения */}
      </ErrorBoundary>
    </ThemeProvider>
  );
}
```

## 5. Оптимизация SQL запросов

### Добавление индексов
```sql
-- backend/migrations/add_indexes.sql
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id);
CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id);
CREATE INDEX IF NOT EXISTS idx_processes_project_id ON processes(project_id);
CREATE INDEX IF NOT EXISTS idx_processes_updated_at ON processes(updated_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
```

### Оптимизированные запросы
```javascript
// backend/optimized-queries.js
const getProjectsWithDetails = (userId, userRole) => {
  if (userRole === 'admin') {
    return `
      SELECT 
        p.*,
        u.name as creator_name,
        COUNT(DISTINCT pu.user_id) as user_count,
        COUNT(DISTINCT pr.id) as process_count
      FROM projects p 
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN project_users pu ON p.id = pu.project_id
      LEFT JOIN processes pr ON p.id = pr.project_id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `;
  } else {
    return `
      SELECT 
        p.*,
        u.name as creator_name,
        COUNT(DISTINCT pu.user_id) as user_count,
        COUNT(DISTINCT pr.id) as process_count
      FROM projects p 
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN project_users pu ON p.id = pu.project_id
      LEFT JOIN processes pr ON p.id = pr.project_id
      WHERE pu.user_id = ? OR p.created_by = ?
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `;
  }
};
```