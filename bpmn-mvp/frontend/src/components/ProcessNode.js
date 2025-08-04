import React, { useState, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, IconButton, Card, CardContent
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import { Handle, Position } from '@xyflow/react';

// Логика для создания связей с drag-and-drop как в Miro
function ProcessNode({ data, selected, id }) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredConnectionPoint, setHoveredConnectionPoint] = useState(null);
  const nodeRef = useRef(null);
  
  const isHighlighted = data.highlighted;
  const isFound = data.found;
  const isConnecting = data.isConnecting; // Состояние для создания связи
  const showHoverPoints = data.showHoverPoints; // Показывать точки при наведении
  
  // Показываем точки соединения при выделении, создании связи или наведении
  const showConnectionPoints = selected || isConnecting || showHoverPoints;
  
  // Базовый стиль для синих точек соединения
  const connectionPointStyle = {
    width: 8,
    height: 8,
    background: '#0073e6',
    border: '2px solid white',
    borderRadius: '50%',
    cursor: 'pointer',
    opacity: showConnectionPoints ? 1 : 0,
    transition: 'all 0.15s ease',
    zIndex: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    pointerEvents: showConnectionPoints ? 'auto' : 'none',
  };
  
  // Стиль при наведении на точку соединения
  const hoveredConnectionPointStyle = {
    ...connectionPointStyle,
    width: 10,
    height: 10,
    background: '#005bb5',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    transform: 'scale(1.1)',
  };
  
  // Обработчик наведения на точку соединения
  const handleConnectionPointHover = useCallback((pointId) => {
    setHoveredConnectionPoint(pointId);
  }, []);
  
  // Обработчик ухода с точки соединения
  const handleConnectionPointLeave = useCallback(() => {
    setHoveredConnectionPoint(null);
  }, []);
  
  // Получаем стиль для конкретной точки соединения
  const getConnectionPointStyle = (pointId) => {
    return hoveredConnectionPoint === pointId 
      ? hoveredConnectionPointStyle 
      : connectionPointStyle;
  };

  // Упрощенный обработчик клика по точке соединения
  const handleConnectionPointClick = useCallback((pointId, event) => {
    console.log('🔵 КЛИК ПО ТОЧКЕ СОЕДИНЕНИЯ:', { pointId, nodeId: id });
    console.log('📊 Данные узла:', { 
      isConnecting: data.isConnecting, 
      showHoverPoints: data.showHoverPoints,
      onStartConnection: !!data.onStartConnection,
      allKeys: Object.keys(data)
    });
    
    event.stopPropagation();
    event.preventDefault();
    
    if (data.onStartConnection) {
      console.log('✅ Вызываем onStartConnection с параметрами:', id, pointId);
      data.onStartConnection(id, pointId);
    } else {
      console.log('❌ onStartConnection не найден в data:', Object.keys(data));
    }
  }, [id, data]);

  // Обработчик начала перетаскивания
  const handleMouseDown = useCallback((pointId, event) => {
    console.log('🖱️ MOUSEDOWN НА ТОЧКЕ:', pointId);
    
    // Пров��ряем, что это левая кнопка мыши
    if (event.button !== 0) return;
    
    event.stopPropagation();
    
    // Начинаем drag-режим
    if (data.onStartDrag) {
      console.log('✅ Начинаем drag от точки:', pointId);
      data.onStartDrag(id, pointId, event);
    } else {
      console.log('❌ onStartDrag не найден в data');
    }
  }, [id, data]);
  
  // Компонент точки соединения
  const ConnectionPoint = ({ pointId, position, style, type = "source" }) => (
    <Handle
      type={type}
      position={position}
      id={`${pointId}-${type}`}
      style={{
        ...getConnectionPointStyle(pointId),
        ...style,
      }}
      onMouseEnter={() => handleConnectionPointHover(pointId)}
      onMouseLeave={handleConnectionPointLeave}
      onClick={(e) => handleConnectionPointClick(pointId, e)}
      onMouseDown={(e) => handleMouseDown(pointId, e)}
    />
  );
  
  return (
    <Box 
      ref={nodeRef}
      sx={{ position: 'relative' }}
      onMouseEnter={() => {
        setIsHovered(true);
        if (data.onMouseEnter) {
          data.onMouseEnter();
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (data.onMouseLeave) {
          data.onMouseLeave();
        }
      }}
    >
      {/* Видимые точки соединения (source) - показываются при выделении или наведении */}
      
      {/* Верхняя точка */}
      <ConnectionPoint
        pointId="top"
        position={Position.Top}
        style={{
          top: -4,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
      
      {/* Правая точка */}
      <ConnectionPoint
        pointId="right"
        position={Position.Right}
        style={{
          right: -4,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
      
      {/* Нижняя точка */}
      <ConnectionPoint
        pointId="bottom"
        position={Position.Bottom}
        style={{
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
      
      {/* Левая точка */}
      <ConnectionPoint
        pointId="left"
        position={Position.Left}
        style={{
          left: -4,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Невидимые target handles для входящих связей */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ opacity: 0, pointerEvents: 'none' }}
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
          transition: 'all 0.2s ease',
          border: selected || isHighlighted ? '2px solid #0073e6' : isFound ? '2px solid #ffd600' : '1px solid #e0e0e0',
          bgcolor: selected || isHighlighted ? '#f0f8ff' : isFound ? '#fffde7' : '#fff',
          boxShadow: selected || isHighlighted ? '0 4px 12px rgba(0,115,230,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
          '&:hover': { 
            transform: selected ? 'none' : 'translateY(-1px)',
            boxShadow: selected ? '0 4px 12px rgba(0,115,230,0.2)' : '0 2px 8px rgba(0,0,0,0.15)',
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          <Box display="flex" alignItems="center" mb={1.5}>
            <DescriptionIcon 
              sx={{ 
                mr: 1, 
                color: selected || isHighlighted ? '#0073e6' : '#666',
                fontSize: 20 
              }} 
            />
            <Typography 
              variant="subtitle1" 
              component="h3" 
              noWrap 
              sx={{ 
                fontWeight: selected || isHighlighted ? 600 : 500,
                color: selected || isHighlighted ? '#0073e6' : '#333',
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
              borderColor: selected || isHighlighted ? '#0073e6' : '#ccc',
              color: selected || isHighlighted ? '#0073e6' : '#666',
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
            title="Уда��ить процесс"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Card>
    </Box>
  );
}

export default ProcessNode;