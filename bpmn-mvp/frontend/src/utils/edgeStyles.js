// Стили для различных типов связей - улучшенные для BPMN-подобного вида
export const getEdgeStyle = (relationType) => {
  const baseStyle = {
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (relationType) {
    case 'one-to-many':
      return {
        ...baseStyle,
        stroke: '#ff9800',
        strokeWidth: 3,
        strokeDasharray: '8,4',
      };
    case 'many-to-many':
      return {
        ...baseStyle,
        stroke: '#f44336',
        strokeWidth: 4,
        strokeDasharray: '12,6',
      };
    default: // one-to-one
      return {
        ...baseStyle,
        stroke: '#2196f3',
        strokeWidth: 2,
      };
  }
};

// Стили для предварительного просмотра связей
export const getConnectionLineStyle = (relationType) => {
  const style = getEdgeStyle(relationType);
  return {
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    strokeDasharray: style.strokeDasharray,
  };
};

export default {
  getEdgeStyle,
  getConnectionLineStyle,
};