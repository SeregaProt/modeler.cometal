import React, { useState, useCallback } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { 
  IconButton, 
  Tooltip, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

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
  markerStart,
  selected,
  data,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Обработчик удаления связи
  const handleDelete = useCallback((evt) => {
    evt.stopPropagation();
    if (data && data.onDelete) {
      data.onDelete(id);
    }
    setMenuAnchor(null);
  }, [id, data]);

  // Обработчик открытия меню настроек
  const handleSettingsClick = useCallback((evt) => {
    evt.stopPropagation();
    setMenuAnchor(evt.currentTarget);
  }, []);

  // Обработчик закрытия меню
  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  // Обработчики изменения типа стрелок
  const handleArrowChange = useCallback((startType, endType) => {
    if (data && data.onArrowChange) {
      data.onArrowChange(id, startType, endType);
    }
    setMenuAnchor(null);
  }, [id, data]);

  // Обработчик начала перетаскивания точки связи
  const handleConnectionPointMouseDown = useCallback((evt, isStart) => {
    evt.stopPropagation();
    setIsDragging(true);
    
    console.log('🔗 Начинаем перетаскивание', isStart ? 'источника' : 'цели', 'связи:', id);
    
    // Определяем, какую точку перетаскиваем
    const dragType = isStart ? 'source' : 'target';
    
    // Добавляем глобальные обработчики мыши для перетаскивания
    const handleMouseMove = (e) => {
      // Визуальная обратная связь во время перетаскивания
      document.body.style.cursor = 'grabbing';
    };
    
    const handleMouseUp = (e) => {
      console.log('🏁 Завершаем перетаскивание точки связи');
      
      // Находим элемент под курсором
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      let targetNodeId = null;
      let targetHandle = null;
      
      for (const element of elements) {
        const nodeElement = element.closest('[data-id]');
        if (nodeElement) {
          const nodeId = nodeElement.getAttribute('data-id');
          if (nodeId) {
            targetNodeId = nodeId;
            
            // Определяем ближайшую точку на узле
            const rect = nodeElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            const deltaX = mouseX - centerX;
            const deltaY = mouseY - centerY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              targetHandle = deltaX > 0 ? 'right' : 'left';
            } else {
              targetHandle = deltaY > 0 ? 'bottom' : 'top';
            }
            break;
          }
        }
      }
      
      if (targetNodeId && targetHandle && data && data.onUpdateHandles) {
        // Получаем текущие handles из edge
        const currentSourceHandle = sourcePosition.toLowerCase();
        const currentTargetHandle = targetPosition.toLowerCase();
        
        if (dragType === 'source') {
          // Обновляем источник
          console.log('✅ Обновляем источник связи:', targetHandle, '->', currentTargetHandle);
          data.onUpdateHandles(id, targetHandle, currentTargetHandle);
        } else {
          // Обновляем цель
          console.log('✅ Обновляем цель связи:', currentSourceHandle, '->', targetHandle);
          data.onUpdateHandles(id, currentSourceHandle, targetHandle);
        }
      } else {
        console.log('❌ Перетаскивание завершено без валидной цели');
      }
      
      // Сбрасываем состояние
      setIsDragging(false);
      document.body.style.cursor = 'default';
      
      // Убираем обработчики
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [id, data, sourcePosition, targetPosition]);

  // Стиль связи с улучшенным внешним видом
  const edgeStyle = {
    ...style,
    strokeWidth: selected ? 3 : isHovered ? 2.5 : 2,
    stroke: selected ? '#2196f3' : style.stroke || '#2196f3',
    strokeDasharray: 'none',
    transition: 'all 0.2s ease',
    filter: selected ? 'drop-shadow(0 2px 4px rgba(33,150,243,0.3))' : 'none',
  };

  // Стиль для точек перетаскивания - ВСЕГДА ВИДИМЫЕ
  const connectionPointStyle = {
    width: 14,
    height: 14,
    background: isDragging ? '#ff9800' : (selected ? '#2196f3' : '#1976d2'),
    border: '3px solid white',
    borderRadius: '50%',
    cursor: isDragging ? 'grabbing' : 'grab',
    boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
    opacity: 1, // ВСЕГДА ВИДИМЫЕ!
    transition: 'all 0.2s ease',
    pointerEvents: 'auto', // ВСЕГДА АКТИВНЫЕ!
    transform: isDragging ? 'scale(1.3)' : (selected || isHovered ? 'scale(1.1)' : 'scale(0.8)'),
    zIndex: 1000,
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={edgeStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {/* Точки перетаскивания ВСЕГДА отображаются */}
      <EdgeLabelRenderer>
        {/* Точка перетаскивания начала связи */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${sourceX}px,${sourceY}px)`,
            pointerEvents: 'all',
            ...connectionPointStyle,
          }}
          className="nodrag nopan"
          onMouseDown={(e) => handleConnectionPointMouseDown(e, true)}
          title="Перетащить начало связи на другую точку"
        />

        {/* Точка перетаскивания конца связи */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${targetX}px,${targetY}px)`,
            pointerEvents: 'all',
            ...connectionPointStyle,
          }}
          className="nodrag nopan"
          onMouseDown={(e) => handleConnectionPointMouseDown(e, false)}
          title="Перетащить конец связи на другую точку"
        />

        {/* Центральное меню - только при выделении */}
        {selected && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {/* Кнопка настроек */}
              <Tooltip title="Настройки связи">
                <IconButton
                  size="small"
                  onClick={handleSettingsClick}
                  sx={{
                    background: 'white',
                    border: '1px solid #2196f3',
                    width: 24,
                    height: 24,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    '&:hover': { 
                      background: '#e3f2fd',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <SettingsIcon fontSize="small" color="primary" />
                </IconButton>
              </Tooltip>

              {/* Кнопка удаления */}
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
            </Box>
          </div>
        )}
      </EdgeLabelRenderer>

      {/* Меню настроек стрелок */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #e0e0e0',
          }
        }}
      >
        <MenuItem disabled>
          <ListItemText primary="Тип стрелок" sx={{ fontWeight: 'bold' }} />
        </MenuItem>
        <Divider />
        
        <MenuItem onClick={() => handleArrowChange(null, 'arrow')}>
          <ListItemIcon>
            <ArrowForwardIcon />
          </ListItemIcon>
          <ListItemText primary="Только конечная стрелка" />
        </MenuItem>
        
        <MenuItem onClick={() => handleArrowChange('arrow', 'arrow')}>
          <ListItemIcon>
            <SwapHorizIcon />
          </ListItemIcon>
          <ListItemText primary="Двусторонняя стрелка" />
        </MenuItem>
        
        <MenuItem onClick={() => handleArrowChange('arrow', null)}>
          <ListItemIcon>
            <ArrowBackIcon />
          </ListItemIcon>
          <ListItemText primary="Только начальная стрелка" />
        </MenuItem>
        
        <MenuItem onClick={() => handleArrowChange(null, null)}>
          <ListItemIcon>
            <RadioButtonUncheckedIcon />
          </ListItemIcon>
          <ListItemText primary="Без стрелок" />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon color="error" />
          </ListItemIcon>
          <ListItemText primary="Удалить связь" />
        </MenuItem>
      </Menu>
    </>
  );
};

export default SimpleEdge;