// Утилиты для работы с аутентификацией

/**
 * Очищает недействительный токен и перенаправляет на логин
 */
export const clearInvalidToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.reload();
};

/**
 * Проверяет валидность токена
 */
export const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    // Простая проверка структуры JWT токена
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Проверяем, что payload можно декодировать
    const payload = JSON.parse(atob(parts[1]));
    
    // Проверяем срок действия
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Получает токен из localStorage с проверкой валидности
 */
export const getValidToken = () => {
  const token = localStorage.getItem('token');
  
  if (!isTokenValid(token)) {
    clearInvalidToken();
    return null;
  }
  
  return token;
};

/**
 * Создает заголовки для API запросов с токеном
 */
export const getAuthHeaders = (additionalHeaders = {}) => {
  const token = getValidToken();
  
  if (!token) {
    return additionalHeaders;
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    ...additionalHeaders
  };
};

/**
 * Обработчик ошибок API с автоматической очисткой токена
 */
export const handleApiError = (response) => {
  if (response.status === 401 || response.status === 403) {
    clearInvalidToken();
    return;
  }
  
  throw new Error(`HTTP error! status: ${response.status}`);
};

/**
 * Wrapper для fetch с автоматической обработкой токенов
 */
export const authenticatedFetch = async (url, options = {}) => {
  const headers = getAuthHeaders(options.headers || {});
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    handleApiError(response);
  }
  
  return response;
};