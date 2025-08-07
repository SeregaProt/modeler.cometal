import React, { useState, useCallback } from 'react';
import {
  Box, Typography, Button, IconButton, Card, CardContent
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import { Handle, Position } from '@xyflow/react';

function ProcessNode({ data, selected, id }) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredConnectionPoint, setHoveredConnectionPoint] = useState(null);
  
  const isHighlighted = data.highlighted;
  const isFound = data.found;
  const isConnecting = data.isConnecting;
  const isTargetHovered = data.isTargetHovered;
  
  // Показываем точки соединения при выделении, наведении или когда тащат связь
  const showConnectionPoints = (selected || isHovered || isConnecting || isTargetHovered) && !data.isEdgeSelected;
  
  // Стиль для точек соединения - маленькие синие точки с плюсом
  const connectionPointStyle = {
    width: 16,
    height: 16,
    background: isTargetHovered ? '#4caf50' : '#2196f3',
    border: '2px solid white',
    borderRadius: '50%',
    cursor: 'grab',
    opacity: showConnectionPoints ? 1 : 0,
    transition: 'opacity 0.2s ease',
    zIndex: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    pointerEvents: showConnectionPoints ? 'auto' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: 'white',
    fontWeight: 'bold',
    userSelect: 'none',
  };
  
  // Стиль при наведении на точку соединения
  const hoveredConnectionPointStyle = {
    ...connectionPointStyle,
    width: 18,
    height: 18,
    background: isTargetHovered ? '#388e3c' : '#1976d2',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    cursor: 'grabbing',
  };
  
  // Стиль для магнитных точек на целевом процессе
  const magneticPointStyle = {
    width: 14,
    height: 14,
    background: '#4caf50',
    border: '2px solid white',
    borderRadius: '50%',
    opacity: isTargetHovered ? 1 : 0,
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    zIndex: 25,
    boxShadow: '0 2px 8px rgba(76,175,80,0.4)',
    pointerEvents: 'none',
    animation: isTargetHovered ? 'pulse 1.5s infinite' : 'none',
    transform: isTargetHovered ? 'scale(1.1)' : 'scale(1)',
  };
  
  // Получаем стиль для конкретной точки соединения
  const getConnectionPointStyle = (pointId) => {
    if (isTargetHovered) {
      return magneticPointStyle;
    }
    return hoveredConnectionPoint === pointId 
      ? hoveredConnectionPointStyle 
      : connectionPointStyle;
  };

  // Обработчик наведения на точку соединения
  const handleConnectionPointHover = useCallback((pointId, event) => {
    if (!isTargetHovered) { // Не меняем hover если это целевой процесс
      event.stopPropagation();
      setHoveredConnectionPoint(pointId);
    }
  }, [isTargetHovered]);
  
  // Обработчик ухода с точки соединения
  const handleConnectionPointLeave = useCallback((event) => {
    if (!isTargetHovered) { // Не меняем hover если это целевой процесс
      event.stopPropagation();
      setHoveredConnectionPoint(null);
    }
  }, [isTargetHovered]);

  // Обработчик наведения на узел - только для показа точек соединения
  const handleNodeMouseEnter = useCallback((event) => {
    setIsHovered(true);
  }, []);

  // Обработчик ухода с узла
  const handleNodeMouseLeave = useCallback((event) => {
    // Проверяем, не ушли ли мы на точку соединения
    const relatedTarget = event.relatedTarget;
    if (relatedTarget && relatedTarget.closest && relatedTarget.closest('[data-connection-point]')) {
      return; // Не убираем hover если перешли на точку соединения
    }
    
    setIsHovered(false);
    setHoveredConnectionPoint(null);
  }, []);

  // Обработчик отпускания мыши на узле (для завершения создания связи)
  const handleNodeMouseUp = useCallback((event) => {
    console.log('🎯 MouseUp на узле:', id, 'isTargetHovered:', isTargetHovered);
    
    if (data.onEndDrag && isTargetHovered) {
      // Определяем ближайшую точку для подключения
      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      
      const deltaX = mouseX - centerX;
      const deltaY = mouseY - centerY;
      
      let closestPoint = 'top';
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        closestPoint = deltaX > 0 ? 'right' : 'left';
      } else {
        closestPoint = deltaY > 0 ? 'bottom' : 'top';
      }
      
      console.log('🎯 Завершаем создание связи на точке:', closestPoint);
      data.onEndDrag(id, closestPoint, event);
    }
  }, [id, data, isTargetHovered]);
  
  // Компонент точки соединения с плюсом
  const ConnectionPoint = ({ pointId, position, style }) => (
    <div
      data-connection-point={pointId}
      className="nodrag nopan"
      style={{
        position: 'absolute',
        ...getConnectionPointStyle(pointId),
        ...style,
      }}
      onMouseEnter={(e) => handleConnectionPointHover(pointId, e)}
      onMouseLeave={handleConnectionPointLeave}
      onMouseDown={(e) => {
        console.log('🔗 MouseDown на точке соединения:', pointId, 'узла:', id);
        
        // Останавливаем всплытие события
        e.stopPropagation();
        e.preventDefault();
        
        if (data.onStartDrag) {
          console.log('🔗 Начинаем перетаскивание связи');
          data.onStartDrag(id, pointId, e);
        }
      }}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      title={isTargetHovered ? "Отпустите для создания связи" : "Нажмите и тяните для создания связи"}
    >
      {isTargetHovered ? '●' : '+'}
    </div>
  );
  
  // Невидимые handles для ReactFlow
  const InvisibleHandle = ({ pointId, position, type = 'source' }) => (
    <Handle
      type={type}
      position={position}
      id={`${pointId}-${type}`}
      style={{
        opacity: 0,
        pointerEvents: 'none',
        width: 1,
        height: 1,
      }}
    />
  );
  
  return (
    <Box 
      sx={{ position: 'relative' }}
      data-id={id}
    >
      {/* Добавляем CSS анимацию для пульсации */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1.1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.8; }
            100% { transform: scale(1.1); opacity: 1; }
          }
        `}
      </style>

      {/* Невидимая зона для раннего срабатывания наведения - расширяем на 40px во все стороны */}
      <Box
        sx={{
          position: 'absolute',
          top: -40,
          left: -40,
          right: -40,
          bottom: -40,
          zIndex: 5,
          pointerEvents: 'auto',
          cursor: 'default',
        }}
        onMouseEnter={handleNodeMouseEnter}
        onMouseLeave={handleNodeMouseLeave}
        onMouseUp={handleNodeMouseUp}
      />

      {/* Невидимые handles для ReactFlow */}
      <InvisibleHandle pointId="top" position={Position.Top} type="source" />
      <InvisibleHandle pointId="right" position={Position.Right} type="source" />
      <InvisibleHandle pointId="bottom" position={Position.Bottom} type="source" />
      <InvisibleHandle pointId="left" position={Position.Left} type="source" />
      
      <InvisibleHandle pointId="top" position={Position.Top} type="target" />
      <InvisibleHandle pointId="right" position={Position.Right} type="target" />
      <InvisibleHandle pointId="bottom" position={Position.Bottom} type="target" />
      <InvisibleHandle pointId="left" position={Position.Left} type="target" />

      {/* Видимые точки соединения с плюсом */}
      
      {/* Верхняя точка - на расстоянии 3мм (~11px) от карточки */}
      <ConnectionPoint
        pointId="top"
        position={Position.Top}
        style={{
          top: -14,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
      
      {/* Правая точка */}
      <ConnectionPoint
        pointId="right"
        position={Position.Right}
        style={{
          right: -14,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
      
      {/* Нижняя точка */}
      <ConnectionPoint
        pointId="bottom"
        position={Position.Bottom}
        style={{
          bottom: -14,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
      
      {/* Левая точка */}
      <ConnectionPoint
        pointId="left"
        position={Position.Left}
        style={{
          left: -14,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
      
      {/* Карточка процесса */}
      <Card 
        sx={{ 
          minWidth: 220,
          maxWidth: 280,
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: selected || isHighlighted ? '2px solid #2196f3' : 
                  isTargetHovered ? '3px solid #4caf50' :
                  isFound ? '2px solid #ffd600' : '1px solid #e0e0e0',
          bgcolor: selected || isHighlighted ? '#e3f2fd' : 
                   isTargetHovered ? '#e8f5e8' :
                   isFound ? '#fffde7' : '#fff',
          boxShadow: selected || isHighlighted ? '0 4px 12px rgba(33,150,243,0.2)' : 
                     isTargetHovered ? '0 6px 20px rgba(76,175,80,0.3)' :
                     '0 1px 3px rgba(0,0,0,0.1)',
          '&:hover': { 
            transform: selected || isTargetHovered ? 'none' : 'translateY(-1px)',
            boxShadow: selected ? '0 4px 12px rgba(33,150,243,0.2)' : 
                       isTargetHovered ? '0 6px 20px rgba(76,175,80,0.3)' :
                       '0 2px 8px rgba(0,0,0,0.15)',
          },
          zIndex: 10, // Карточка должна быть выше невидимой зоны
          position: 'relative',
        }}
      >
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          <Box display="flex" alignItems="center" mb={1.5}>
            <DescriptionIcon 
              sx={{ 
                mr: 1, 
                color: selected || isHighlighted ? '#2196f3' : 
                       isTargetHovered ? '#4caf50' : '#666',
                fontSize: 20 
              }} 
            />
            <Typography 
              variant="subtitle1" 
              component="h3" 
              noWrap 
              sx={{ 
                fontWeight: selected || isHighlighted ? 600 : 500,
                color: selected || isHighlighted ? '#2196f3' : 
                       isTargetHovered ? '#4caf50' : '#333',
                fontSize: '0.95rem',
              }}
            >
              {data.name}
            </Typography>
          </Box>
          
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ fontSize: '0.8rem', mb: 1.5 }}
          >
            BPMN процесс
          </Typography>
          
          <Box>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: '0.75rem', display: 'block' }}
            >
              Автор: {data.author || 'Неизвестно'}
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: '0.75rem', display: 'block' }}
            >
              Изменен: {data.updated_at ? new Date(data.updated_at).toLocaleDateString() : 'Никогда'}
            </Typography>
          </Box>
        </CardContent>
        
        <Box sx={{ p: 1.5, pt: 0, display: 'flex', gap: 1 }}>
          <Button 
            size="small" 
            variant="outlined"
            startIcon={<EditIcon />}
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit && data.onEdit();
            }}
            sx={{ 
              fontSize: '0.75rem',
              py: 0.5,
              borderColor: selected || isHighlighted ? '#2196f3' : '#ccc',
              color: selected || isHighlighted ? '#2196f3' : '#666',
            }}
          >
            Открыть
          </Button>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete && data.onDelete();
            }}
            sx={{ 
              color: '#666',
              '&:hover': { color: '#f44336' },
            }}
            title="Удалить процесс"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Card>
    </Box>
  );
}

export default ProcessNode;