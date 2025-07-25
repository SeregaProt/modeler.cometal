/**
 * Централизованная система обработки ошибок
 */

/**
 * Типы ошибок
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Определяет тип ошибки по сообщению или коду
 * @param {Error} error - Объект ошибки
 * @returns {string} - Тип ошибки
 */
export const getErrorType = (error) => {
  if (!error) return ERROR_TYPES.UNKNOWN;

  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('network') || message.includes('fetch')) {
    return ERROR_TYPES.NETWORK;
  }
  
  if (message.includes('authentication') || message.includes('401')) {
    return ERROR_TYPES.AUTHENTICATION;
  }
  
  if (message.includes('authorization') || message.includes('403')) {
    return ERROR_TYPES.AUTHORIZATION;
  }
  
  if (message.includes('validation') || message.includes('400')) {
    return ERROR_TYPES.VALIDATION;
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return ERROR_TYPES.NOT_FOUND;
  }
  
  if (message.includes('500') || message.includes('server')) {
    return ERROR_TYPES.SERVER;
  }
  
  return ERROR_TYPES.UNKNOWN;
};

/**
 * Получает пользовательское сообщение об ошибке
 * @param {Error} error - Объект ошибки
 * @returns {string} - Пользовательское сообщение
 */
export const getUserErrorMessage = (error) => {
  const errorType = getErrorType(error);
  
  const messages = {
    [ERROR_TYPES.NETWORK]: 'Проблемы с сетевым соединением. Проверьте подключение к интернету.',
    [ERROR_TYPES.AUTHENTICATION]: 'Требуется повторная авторизация. Пожалуйста, войдите в систему.',
    [ERROR_TYPES.AUTHORIZATION]: 'У вас недостаточно прав для выполнения этого действия.',
    [ERROR_TYPES.VALIDATION]: 'Проверьте правильность введенных данных.',
    [ERROR_TYPES.NOT_FOUND]: 'Запрашиваемый ресурс не найден.',
    [ERROR_TYPES.SERVER]: 'Внутренняя ошибка сервера. Попробуйте позже.',
    [ERROR_TYPES.UNKNOWN]: 'Произошла неизвестная ошибка. Попробуйте обновить страницу.'
  };
  
  return messages[errorType] || messages[ERROR_TYPES.UNKNOWN];
};

/**
 * Логирует ошибку с дополнительным контекстом
 * @param {Error} error - Объект ошибки
 * @param {string} context - Контекст возникновения ошибки
 * @param {Object} additionalData - Дополнительные данные
 */
export const logError = (error, context = '', additionalData = {}) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    type: getErrorType(error),
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...additionalData
  };
  
  console.error('Application Error:', errorInfo);
  
  // В продакшн среде здесь можно отправлять ошибки в систему мониторинга
  if (process.env.NODE_ENV === 'production') {
    // Например, отправка в Sentry, LogRocket и т.��.
    // sendToErrorTracking(errorInfo);
  }
};

/**
 * Обработчик ошибок для async/await
 * @param {Function} asyncFn - Асинхронная функция
 * @param {string} context - Контекст выполнения
 * @returns {Function} - Обернутая функция
 */
export const withErrorHandling = (asyncFn, context = '') => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      logError(error, context, { args });
      throw error;
    }
  };
};

/**
 * Создает обработчик ошибок для компонентов
 * @param {Function} setError - Функция для установки ошибки в состояние
 * @param {Function} setLoading - Функция для управления состоянием загрузки
 * @returns {Function} - Обработчик ошибок
 */
export const createErrorHandler = (setError, setLoading = null) => {
  return (error, context = '') => {
    logError(error, context);
    
    if (setLoading) {
      setLoading(false);
    }
    
    if (setError) {
      setError(getUserErrorMessage(error));
    }
  };
};

/**
 * Retry функция с экспоненциальной задержкой
 * @param {Function} fn - Функция для повторного выполнения
 * @param {number} maxRetries - Максимальное количество попыток
 * @param {number} baseDelay - Базовая задержка в мс
 * @returns {Promise} - Результат выполнения функции
 */
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Экспоненциальная задержка
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};