import { useState, useCallback } from 'react';

export function useErrorHandler() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleError = useCallback((error, context = '') => {
    console.error(`Error in ${context}:`, error);
    setError(error.message || 'Произошла ошибка');
    setLoading(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = useCallback((asyncFn, context = '') => {
    return async (...args) => {
      try {
        setLoading(true);
        setError(null);
        const result = await asyncFn(...args);
        setLoading(false);
        return result;
      } catch (error) {
        handleError(error, context);
        throw error;
      }
    };
  }, [handleError]);

  return {
    error,
    loading,
    setLoading,
    handleError,
    clearError,
    withErrorHandling
  };
}