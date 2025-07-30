// Утилита для подавления ошибок ResizeObserver
// Эта ошибка часто возникает в ReactFlow и других библиотеках диаграмм

export const suppressResizeObserverError = () => {
  // Подавляем ошибку ResizeObserver в консоли
  const originalError = console.error;
  console.error = (...args) => {
    if (
      args.length > 0 &&
      typeof args[0] === 'string' &&
      args[0].includes('ResizeObserver loop completed with undelivered notifications')
    ) {
      // Игнорируем эту ошибку
      return;
    }
    originalError.apply(console, args);
  };

  // Также подавляем в window.onerror
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (
      typeof message === 'string' &&
      message.includes('ResizeObserver loop completed with undelivered notifications')
    ) {
      return true; // Предотвращаем показ ошибки
    }
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // Подавляем в unhandledrejection
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason &&
      event.reason.message &&
      event.reason.message.includes('ResizeObserver loop completed with undelivered notifications')
    ) {
      event.preventDefault();
    }
  });
};

// Дебаунс функция для ResizeObserver
export const debounceResizeObserver = (callback, delay = 100) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback.apply(null, args), delay);
  };
};

// Безопасный ResizeObserver wrapper
export class SafeResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.observer = null;
    this.init();
  }

  init() {
    try {
      this.observer = new ResizeObserver((entries) => {
        // Используем requestAnimationFrame для предотвращения loop ошибок
        requestAnimationFrame(() => {
          try {
            this.callback(entries);
          } catch (error) {
            if (!error.message.includes('ResizeObserver loop completed')) {
              console.error('ResizeObserver callback error:', error);
            }
          }
        });
      });
    } catch (error) {
      console.warn('ResizeObserver not supported:', error);
    }
  }

  observe(element) {
    if (this.observer && element) {
      try {
        this.observer.observe(element);
      } catch (error) {
        console.warn('Failed to observe element:', error);
      }
    }
  }

  unobserve(element) {
    if (this.observer && element) {
      try {
        this.observer.unobserve(element);
      } catch (error) {
        console.warn('Failed to unobserve element:', error);
      }
    }
  }

  disconnect() {
    if (this.observer) {
      try {
        this.observer.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect observer:', error);
      }
    }
  }
}

export default {
  suppressResizeObserverError,
  debounceResizeObserver,
  SafeResizeObserver
};