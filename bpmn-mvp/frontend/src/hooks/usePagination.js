import { useState, useCallback, useEffect } from 'react';

/**
 * Hook для управления пагинацией
 * @param {Function} fetchFunction - Функция для загрузки данных
 * @param {Object} options - Опции пагинации
 * @returns {Object} - Объект с данными и методами пагинации
 */
export const usePagination = (fetchFunction, options = {}) => {
  const {
    initialPage = 1,
    initialLimit = 10,
    dependencies = [],
    autoLoad = true
  } = options;

  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (page = pagination.page, limit = pagination.limit) => {
    if (!fetchFunction) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchFunction({ page, limit });
      
      // Проверяем формат ответа
      if (response && response.data && response.pagination) {
        // Пагинированный ответ
        setData(response.data);
        setPagination(response.pagination);
      } else if (Array.isArray(response)) {
        // Обычный массив (для обратной совместимости)
        setData(response);
        setPagination({
          page: 1,
          limit: response.length,
          total: response.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        });
      } else {
        // Неожиданный формат
        console.warn('Unexpected response format:', response);
        setData([]);
        setPagination({
          page: 1,
          limit: initialLimit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        });
      }
    } catch (err) {
      console.error('Error loading paginated data:', err);
      setError(err.message || 'Ошибка загрузки данных');
      setData([]);
      setPagination({
        page: 1,
        limit: initialLimit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      });
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, pagination.page, pagination.limit, initialLimit]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage !== pagination.page && newPage >= 1 && newPage <= pagination.totalPages) {
      loadData(newPage, pagination.limit);
    }
  }, [loadData, pagination.page, pagination.limit, pagination.totalPages]);

  const handleLimitChange = useCallback((newLimit) => {
    if (newLimit !== pagination.limit && newLimit > 0) {
      // При изменении лимита возвращаемся на первую страницу
      loadData(1, newLimit);
    }
  }, [loadData, pagination.limit]);

  const refresh = useCallback(() => {
    loadData(pagination.page, pagination.limit);
  }, [loadData, pagination.page, pagination.limit]);

  const reset = useCallback(() => {
    loadData(initialPage, initialLimit);
  }, [loadData, initialPage, initialLimit]);

  const goToFirstPage = useCallback(() => {
    if (pagination.hasPrev) {
      handlePageChange(1);
    }
  }, [handlePageChange, pagination.hasPrev]);

  const goToLastPage = useCallback(() => {
    if (pagination.hasNext) {
      handlePageChange(pagination.totalPages);
    }
  }, [handlePageChange, pagination.hasNext, pagination.totalPages]);

  const goToNextPage = useCallback(() => {
    if (pagination.hasNext) {
      handlePageChange(pagination.page + 1);
    }
  }, [handlePageChange, pagination.hasNext, pagination.page]);

  const goToPrevPage = useCallback(() => {
    if (pagination.hasPrev) {
      handlePageChange(pagination.page - 1);
    }
  }, [handlePageChange, pagination.hasPrev, pagination.page]);

  // Автоматическая загрузка при изменении зависимостей
  useEffect(() => {
    if (autoLoad) {
      loadData(initialPage, initialLimit);
    }
  }, [autoLoad, initialPage, initialLimit, ...dependencies]);

  return {
    // Данные
    data,
    pagination,
    loading,
    error,

    // Методы управления
    handlePageChange,
    handleLimitChange,
    refresh,
    reset,

    // Методы навигации
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPrevPage,

    // Утилиты
    isEmpty: data.length === 0 && !loading,
    hasData: data.length > 0,
    isFirstPage: pagination.page === 1,
    isLastPage: pagination.page === pagination.totalPages,
  };
};

export default usePagination;