import React, { useState, useCallback } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { IconButton, Tooltip, Chip, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import { getActiveEdgeStyle, getHoveredEdgeStyle, getRelationTypeDescription } from '../utils/edgeStyles';

const CustomEdge = ({
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

  const onDelete = useCallback((evt) => {
    evt.stopPropagation();
    if (data && data.onDelete) {
      data.onDelete(id);
    }
  }, [data, id]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Определяем стиль связи в зависимости от состояния
  const getEdgeStyle = () => {
    if (selected) {
      return getActiveEdgeStyle(data?.relationType || 'one-to-one');
    }
    if (isHovered) {
      return getHoveredEdgeStyle(data?.relationType || 'one-to-one');
    }
    return style;
  };

  // Вычисляем позицию кнопки удаления в центре связи
  const deleteButtonX = labelX;
  const deleteButtonY = labelY;

  // Вычисляем позицию информационной метки
  const infoX = labelX;
  const infoY = labelY - 30;

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={getEdgeStyle()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Показываем информацию о типе связи при наведении */}
      {isHovered && data?.relationType && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${infoX}px,${infoY}px)`,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
            className="nodrag nopan"
          >
            <Chip
              size="small"
              label={getRelationTypeDescription(data.relationType)}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                fontSize: '0.75rem',
              }}
              icon={<InfoIcon fontSize="small" />}
            />
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* Кнопка удаления при выделении */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${deleteButtonX}px,${deleteButtonY}px)`,
              pointerEvents: 'all',
              zIndex: 1001,
            }}
            className="nodrag nopan"
          >
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* Информация о типе связи */}
              <Chip
                size="small"
                label={data?.relationType || 'one-to-one'}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #1976d2',
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
              
              {/* Кнопка удаления */}
              <Tooltip title="Удалить связь (Delete)">
                <IconButton
                  size="small"
                  onClick={onDelete}
                  sx={{
                    background: 'white',
                    border: '2px solid #f44336',
                    width: 28,
                    height: 28,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    '&:hover': { 
                      background: '#ffebee',
                      borderColor: '#d32f2f',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <DeleteIcon fontSize="small" color="error" />
                </IconButton>
              </Tooltip>
            </Box>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge;