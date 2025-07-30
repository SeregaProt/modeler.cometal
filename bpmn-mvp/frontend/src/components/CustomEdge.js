import React from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onDelete = (evt) => {
    evt.stopPropagation();
    if (data && data.onDelete) {
      data.onDelete(id);
    }
  };

  // Вычисляем позицию кнопки удаления ближе к концу связи
  const deleteButtonX = targetX + (targetPosition === 'right' ? 15 : targetPosition === 'left' ? -35 : -10);
  const deleteButtonY = targetY + (targetPosition === 'bottom' ? 15 : targetPosition === 'top' ? -35 : -10);

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: selected ? (style.strokeWidth || 2) + 1 : style.strokeWidth,
          stroke: selected ? '#1976d2' : style.stroke,
        }} 
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${deleteButtonX}px,${deleteButtonY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <Tooltip title="Удалить связь">
              <IconButton
                size="small"
                onClick={onDelete}
                sx={{
                  background: 'white',
                  border: '1px solid #f44336',
                  width: 24,
                  height: 24,
                  '&:hover': { 
                    background: '#ffebee',
                    borderColor: '#f44336',
                  },
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

export default CustomEdge;