import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Конфигурация QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry настройки
      retry: (failureCount, error) => {
        // Не повторяем запросы для ошибок аутентификации
        if (error?.message?.includes('Authentication required')) {
          return false;
        }
        // Максимум 3 попытки для других ошибок
        return failureCount < 3;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Кэширование
      staleTime: 5 * 60 * 1000, // 5 минут по умолчанию
      cacheTime: 10 * 60 * 1000, // 10 минут по умолчан��ю
      
      // Поведение
      refetchOnWindowFocus: false, // Не обновляем при фокусе окна
      refetchOnReconnect: true, // Обновляем при восстановлении соединения
      refetchOnMount: true, // Обновляем при монтировании компонента
      
      // Показываем предыдущие данные при загрузке новых
      keepPreviousData: true,
    },
    mutations: {
      // Retry для мутаций
      retry: (failureCount, error) => {
        // Не повторяем мутации для ошибок аутентификации и валидации
        if (error?.message?.includes('Authentication required') || 
            error?.message?.includes('Validation error')) {
          return false;
        }
        // Максимум 2 попытки для других ошибок
        return failureCount < 2;
      },
      retryDelay: 1000,
    },
  },
});

// Обработчик глобальных ошибок
queryClient.setMutationDefaults(['projects'], {
  mutationFn: async (variables) => {
    // Логирование мутаций
    console.log('Mutation started:', variables);
    return variables;
  },
  onError: (error, variables, context) => {
    console.error('Mutation error:', error, variables);
  },
  onSuccess: (data, variables, context) => {
    console.log('Mutation success:', data, variables);
  },
});

// Глобальный обработчик ошибок запросов
queryClient.setQueryDefaults(['projects'], {
  onError: (error) => {
    console.error('Query error:', error);
    
    // Можно добавить глобальную обработку ошибок
    if (error?.message?.includes('Authentication required')) {
      // Перенаправление на страницу входа
      window.location.href = '/login';
    }
  },
});

// Провайдер с настройками
export const QueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools только в development режиме */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
          toggleButtonProps={{
            style: {
              marginLeft: '5px',
              transform: 'scale(0.8)',
            },
          }}
        />
      )}
    </QueryClientProvider>
  );
};

// Экспорт клиента для использования вне компонентов
export { queryClient };

// Утилиты для работы с кэшем
export const cacheUtils = {
  // Очистка всего кэша
  clearAll: () => queryClient.clear(),
  
  // Инвалидация всех запросов
  invalidateAll: () => queryClient.invalidateQueries(),
  
  // Инвалидация по ключу
  invalidateByKey: (key) => queryClient.invalidateQueries([key]),
  
  // Получение данных из кэша
  getCachedData: (key) => queryClient.getQueryData(key),
  
  // Установка данных в кэш
  setCachedData: (key, data) => queryClient.setQueryData(key, data),
  
  // Предзагрузка данных
  prefetch: (key, queryFn, options = {}) => {
    return queryClient.prefetchQuery({
      queryKey: key,
      queryFn,
      staleTime: 5 * 60 * 1000,
      ...options,
    });
  },
  
  // Получение статистики кэша
  getCacheStats: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.isFetching()).length,
      errorQueries: queries.filter(q => q.isError()).length,
      cacheSize: JSON.stringify(cache).length,
    };
  },
};

export default QueryProvider;