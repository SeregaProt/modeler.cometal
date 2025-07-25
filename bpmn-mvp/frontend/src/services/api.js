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

  // Project methods with pagination
  async getProjects(options = {}) {
    const { page = 1, limit = 10 } = options;
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    return this.request(`/api/projects?${params}`);
  }

  async createProject(projectData) {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async updateProject(projectId, projectData) {
    return this.request(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  }

  async deleteProject(projectId) {
    return this.request(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  async getProjectUsers(projectId) {
    return this.request(`/api/projects/${projectId}/users`);
  }

  // Process methods with pagination
  async getProcesses(projectId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    return this.request(`/api/projects/${projectId}/processes?${params}`);
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

  // Search method
  async search(query) {
    return this.request(`/api/search?q=${encodeURIComponent(query)}`);
  }

  // Utility methods for pagination
  async getAllProjects() {
    // Для случаев, когда нужны все проекты (например, для выпадающих списков)
    return this.request('/api/projects?limit=1000');
  }

  async getAllUsers() {
    // Для случаев, когда нужны все пользователи
    return this.request('/api/users');
  }
}

export default new ApiService();