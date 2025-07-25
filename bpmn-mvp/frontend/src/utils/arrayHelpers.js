/**
 * Утилиты для безопасной работы с массивами
 */

/**
 * Обеспечивает, что переданное значение является массивом
 * @param {any} data - Данные для проверки
 * @returns {Array} - Массив или пустой массив
 */
export const ensureArray = (data) => {
  return Array.isArray(data) ? data : [];
};

/**
 * Безопасная фильтрация массива
 * @param {any} array - Массив для фильтрации
 * @param {Function} filterFn - Функция фильтрации
 * @returns {Array} - Отфильтрованный массив
 */
export const safeFilter = (array, filterFn) => {
  const safeArray = ensureArray(array);
  return safeArray.filter(filterFn);
};

/**
 * Безопасное преобразование массива
 * @param {any} array - Массив для преобразования
 * @param {Function} mapFn - Функция преобразования
 * @returns {Array} - Преобразованный м��ссив
 */
export const safeMap = (array, mapFn) => {
  const safeArray = ensureArray(array);
  return safeArray.map(mapFn);
};

/**
 * Безопасный поиск элемента в массиве
 * @param {any} array - Массив для поиска
 * @param {Function} findFn - Функция поиска
 * @returns {any} - Найденный элемент или undefined
 */
export const safeFind = (array, findFn) => {
  const safeArray = ensureArray(array);
  return safeArray.find(findFn);
};

/**
 * Безопасная сортировка массива
 * @param {any} array - Массив для сортировки
 * @param {Function} compareFn - Функция сравнения
 * @returns {Array} - Отсортированный массив
 */
export const safeSort = (array, compareFn) => {
  const safeArray = ensureArray(array);
  return [...safeArray].sort(compareFn);
};

/**
 * Безопасное получение длины массива
 * @param {any} array - Массив
 * @returns {number} - Длина массива
 */
export const safeLength = (array) => {
  const safeArray = ensureArray(array);
  return safeArray.length;
};

/**
 * Проверяет, является ли массив пустым
 * @param {any} array - Массив для проверки
 * @returns {boolean} - true если массив пустой
 */
export const isEmpty = (array) => {
  return safeLength(array) === 0;
};

/**
 * Безопасное получение элемента по индексу
 * @param {any} array - Массив
 * @param {number} index - Индекс
 * @param {any} defaultValue - Значение по умолчанию
 * @returns {any} - Элемент или значение по умолчанию
 */
export const safeGet = (array, index, defaultValue = undefined) => {
  const safeArray = ensureArray(array);
  return safeArray[index] !== undefined ? safeArray[index] : defaultValue;
};