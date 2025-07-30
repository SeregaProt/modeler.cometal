import React from 'react';
import {
  Box, Typography, Button, IconButton, Card, CardContent
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import { Handle, Position } from '@xyflow/react';

// Кастомный компонент узла процесса с Handle для соединений
function ProcessNode({ data, selected }) {
  const isHighlighted = data.highlighted;
  const isFound = data.found;
  
  const handleStyle = {
    background: '#1976d2',
    width: 10,
    height: 10,
    border: '2px solid white',
    borderRadius: '50%',
  };
  
  return (
    <Box sx={{ position: 'relative' }}>
      {/* Handles для соединений - каждая сторона может быть и source, и target */}
      {/* Верх */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{ ...handleStyle, top: -5 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{ ...handleStyle, top: -5, opacity: 0 }}
      />
      
      {/* Право */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ ...handleStyle, right: -5 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ ...handleStyle, right: -5, opacity: 0 }}
      />
      
      {/* Низ */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{ ...handleStyle, bottom: -5 }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{ ...handleStyle, bottom: -5, opacity: 0 }}
      />
      
      {/* Лево */}
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{ ...handleStyle, left: -5 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ ...handleStyle, left: -5, opacity: 0 }}
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
          transition: 'all 0.2s',
          border: selected || isHighlighted ? '3px solid #1976d2' : isFound ? '3px solid #ffd600' : 'none',
          bgcolor: selected || isHighlighted ? '#e3f2fd' : isFound ? '#fffde7' : '#fff',
          '&:hover': { 
            transform: 'translateY(-2px)',
            boxShadow: 4 
          }
        }}
        onClick={() => data.onEdit && data.onEdit()}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <DescriptionIcon color="primary" sx={{ mr: 1 }} />
            <Typography 
              variant="h6" 
              component="h3" 
              noWrap 
              sx={{ 
                mr: 1,
                fontWeight: selected || isHighlighted ? 'bold' : 'normal',
                color: selected || isHighlighted ? 'primary.main' : 'text.primary'
              }}
            >
              {data.name}
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            BPMN диаграмма
          </Typography>
          
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary">
              Создал: {data.author || 'Неизвестно'}
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              Изменен: {data.updated_at ? new Date(data.updated_at).toLocaleDateString() : 'Никогда'}
            </Typography>
          </Box>
        </CardContent>
        
        <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
          <Button 
            size="small" 
            color="primary"
            startIcon={<EditIcon />}
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit && data.onEdit();
            }}
          >
            Открыть редактор
          </Button>
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete && data.onDelete();
            }}
            sx={{ ml: 1 }}
            title="Удалить процесс"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Card>
    </Box>
  );
}

export default ProcessNode;