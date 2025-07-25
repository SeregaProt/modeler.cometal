/**
 * Middleware для пагинации
 */

/**
 * Middleware для обработки параметров пагинации
 * @param {Object} options - Опции пагинации
 * @param {number} options.defaultLimit - Лимит по умолчанию
 * @param {number} options.maxLimit - Максимальный лимит
 */
const paginate = (options = {}) => {
  const { defaultLimit = 10, maxLimit = 100 } = options;
  
  return (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit) || defaultLimit));
    const offset = (page - 1) * limit;

    // Валидация параметров
    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1 || limit > maxLimit) {
      return res.status(400).json({ 
        error: 'Некорректные параметры пагинации',
        details: {
          page: 'Должно быть положительным числом',
          limit: `Должно быть от 1 до ${maxLimit}`
        }
      });
    }

    req.pagination = { page, limit, offset };
    next();
  };
};

/**
 * Создает ответ с пагинацией
 * @param {Array} data - Данные для ответа
 * @param {number} total - Общее количество записей
 * @param {Object} pagination - Параметры пагинации
 * @returns {Object} - Ответ с пагинацией
 */
const createPaginatedResponse = (data, total, pagination) => {
  const { page, limit } = pagination;
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    }
  };
};

/**
 * Выполняет пагинированный запрос к базе данных
 * @param {Object} db - Объект базы данных
 * @param {string} countQuery - SQL запрос для подсчета
 * @param {string} dataQuery - SQL запрос для получения данных
 * @param {Array} countParams - Параметры для запроса подсчета
 * @param {Array} dataParams - Параметры для запроса данных
 * @returns {Promise} - Promise с результатом
 */
const executePaginatedQuery = (db, countQuery, dataQuery, countParams = [], dataParams = []) => {
  return new Promise((resolve, reject) => {
    // Выполняем оба запроса параллельно
    Promise.all([
      new Promise((resolve, reject) => {
        db.get(countQuery, countParams, (err, result) => {
          if (err) reject(err);
          else resolve(result.total || result.count || 0);
        });
      }),
      new Promise((resolve, reject) => {
        db.all(dataQuery, dataParams, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      })
    ])
    .then(([total, data]) => resolve({ total, data }))
    .catch(reject);
  });
};

module.exports = {
  paginate,
  createPaginatedResponse,
  executePaginatedQuery
};