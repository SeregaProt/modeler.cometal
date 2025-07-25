import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

// Ключи для кэширования
export const queryKeys = {
  projects: (options = {}) => ['projects', options],
  project: (id) => ['project', id],
  processes: (projectId, options = {}) => ['processes', projectId, options],
  process: (id) => ['process', id],
  users: () => ['users'],
  projectUsers: (projectId) => ['projectUsers', projectId],
  search: (query) => ['search', query]
};

// Проекты
export const useProjects = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.projects(options),
    queryFn: () => apiService.getProjects(options),
    staleTime: 5 * 60 * 1000, // 5 минут
    cacheTime: 10 * 60 * 1000, // 10 минут
    keepPreviousData: true, // Показываем предыдущие данные при загрузке новых
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.createProject,
    onSuccess: () => {
      // Инвалидируем кэш проектов
      queryClient.invalidateQueries(['projects']);
    },
    onError: (error) => {
      console.error('Error creating project:', error);
    }
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, data }) => apiService.updateProject(projectId, data),
    onSuccess: (data, variables) => {
      // Обновляем кэш конкретного проекта
      queryClient.setQueryData(['project', variables.projectId], data);
      // Инвалидируем список проектов
      queryClient.invalidateQueries(['projects']);
    },
  });
};

// Процессы
export const useProcesses = (projectId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.processes(projectId, options),
    queryFn: () => apiService.getProcesses(projectId, options),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 минуты
    cacheTime: 5 * 60 * 1000, // 5 минут
    keepPreviousData: true,
  });
};

export const useProcess = (processId) => {
  return useQuery({
    queryKey: queryKeys.process(processId),
    queryFn: () => apiService.getProcess(processId),
    enabled: !!processId,
    staleTime: 1 * 60 * 1000, // 1 минута
    cacheTime: 5 * 60 * 1000, // 5 минут
  });
};

export const useCreateProcess = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.createProcess,
    onSuccess: (data, variables) => {
      // Инвалидируем список процессов для проекта
      queryClient.invalidateQueries(['processes', variables.project_id]);
    },
  });
};

export const useUpdateProcess = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, data }) => apiService.updateProcess(processId, data),
    onSuccess: (data, variables) => {
      // Обновляем кэш конкретного процесса
      queryClient.setQueryData(['process', variables.processId], data);
      // Инвалидируем список процессов
      queryClient.invalidateQueries(['processes']);
    },
  });
};

export const useDeleteProcess = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.deleteProcess,
    onSuccess: (data, processId) => {
      // Удаляем из кэша
      queryClient.removeQueries(['process', processId]);
      // Инвалидируем список процессов
      queryClient.invalidateQueries(['processes']);
    },
  });
};

// Пользователи
export const useUsers = () => {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: apiService.getUsers,
    staleTime: 10 * 60 * 1000, // 10 минут
    cacheTime: 15 * 60 * 1000, // 15 минут
  });
};

export const useProjectUsers = (projectId) => {
  return useQuery({
    queryKey: queryKeys.projectUsers(projectId),
    queryFn: () => apiService.getProjectUsers(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    },
  });
};

export const useAssignUserToProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, userId }) => apiService.assignUserToProject(projectId, userId),
    onSuccess: (data, variables) => {
      // Инвалидируем список пользователей проекта
      queryClient.invalidateQueries(['projectUsers', variables.projectId]);
    },
  });
};

// Поиск
export const useSearch = (query, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => apiService.search(query),
    enabled: enabled && !!query && query.length > 2,
    staleTime: 30 * 1000, // 30 секунд
    cacheTime: 2 * 60 * 1000, // 2 минуты
  });
};

// Утилиты для работы с кэшем
export const useCacheUtils = () => {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries();
  };

  const clearCache = () => {
    queryClient.clear();
  };

  const prefetchProjects = (options = {}) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects(options),
      queryFn: () => apiService.getProjects(options),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchProcesses = (projectId, options = {}) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.processes(projectId, options),
      queryFn: () => apiService.getProcesses(projectId, options),
      staleTime: 2 * 60 * 1000,
    });
  };

  return {
    invalidateAll,
    clearCache,
    prefetchProjects,
    prefetchProcesses,
  };
};