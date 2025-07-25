import { useCallback, useRef } from 'react';

/**
 * Hook для создания debounced функции
 * @param {Function} callback - Функция для debounce
 * @param {number} delay - Задержка в миллисекундах
 * @returns {Array} - [debouncedCallback, cancel]
 */
export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return [debouncedCallback, cancel];
};

export default useDebounce;