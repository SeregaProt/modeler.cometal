// Стили для различных типов связей в стиле Miro - улучшенные и современные
export const getEdgeStyle = (relationType) => {
  const baseStyle = {
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    transition: 'all 0.2s ease',
  };

  switch (relationType) {
    case 'one-to-many':
      return {
        ...baseStyle,
        stroke: '#ff9800',
        strokeWidth: 3,
        strokeDasharray: '8,4',
        filter: 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.2))',
      };
    case 'many-to-many':
      return {
        ...baseStyle,
        stroke: '#f44336',
        strokeWidth: 4,
        strokeDasharray: '12,6',
        filter: 'drop-shadow(0 2px 4px rgba(244, 67, 54, 0.2))',
      };
    default: // one-to-one
      return {
        ...baseStyle,
        stroke: '#2196f3',
        strokeWidth: 2,
        filter: 'drop-shadow(0 2px 4px rgba(33, 150, 243, 0.2))',
      };
  }
};

// Стили для предварительного просмотра связей при перетаскивании
export const getConnectionLineStyle = (relationType) => {
  const style = getEdgeStyle(relationType);
  return {
    stroke: style.stroke,
    strokeWidth: style.strokeWidth + 1, // Немного тол��е для лучшей видимости
    strokeDasharray: style.strokeDasharray,
    opacity: 0.8,
    filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15))',
  };
};

// Стили для активных (выделенных) связей
export const getActiveEdgeStyle = (relationType) => {
  const baseStyle = getEdgeStyle(relationType);
  return {
    ...baseStyle,
    strokeWidth: baseStyle.strokeWidth + 2,
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25))',
    opacity: 1,
  };
};

// Стили для связей при наведении
export const getHoveredEdgeStyle = (relationType) => {
  const baseStyle = getEdgeStyle(relationType);
  return {
    ...baseStyle,
    strokeWidth: baseStyle.strokeWidth + 1,
    filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.2))',
    opacity: 0.9,
  };
};

// Цвета для различных типов связей (для использования в UI)
export const getRelationTypeColor = (relationType) => {
  switch (relationType) {
    case 'one-to-many':
      return '#ff9800';
    case 'many-to-many':
      return '#f44336';
    default: // one-to-one
      return '#2196f3';
  }
};

// Описания типов связей для UI
export const getRelationTypeDescription = (relationType) => {
  switch (relationType) {
    case 'one-to-many':
      return 'Один процесс связан с несколькими';
    case 'many-to-many':
      return 'Сложная связь между группами процессов';
    default: // one-to-one
      return 'Простая связь между процессами';
  }
};

export default {
  getEdgeStyle,
  getConnectionLineStyle,
  getActiveEdgeStyle,
  getHoveredEdgeStyle,
  getRelationTypeColor,
  getRelationTypeDescription,
};