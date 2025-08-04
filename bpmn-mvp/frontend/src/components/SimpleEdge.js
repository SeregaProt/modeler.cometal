import React, { useState } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

// Простой компонент связи в стиле Miro
const SimpleEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = (evt) => {
    evt.stopPropagation();
    if (data && data.onDelete) {
      data.onDelete(id);
    }
  };

  // Стиль связи в зависимости от состояния
  const edgeStyle = {
    ...style,
    strokeWidth: selected ? 3 : isHovered ? 2.5 : 2,
    stroke: selected ? '#0073e6' : style.stroke || '#666',
    transition: 'all 0.15s ease',
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={edgeStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {/* Кнопка удаления при выделении */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <Tooltip title="Удалить связь">
              <IconButton
                size="small"
                onClick={handleDelete}
                sx={{
                  background: 'white',
                  border: '1px solid #f44336',
                  width: 24,
                  height: 24,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  '&:hover': { 
                    background: '#ffebee',
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                <DeleteIcon fontSize="small" color="error" />
              </IconButton>
            </Tooltip>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default SimpleEdge;