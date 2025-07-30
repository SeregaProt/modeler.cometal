import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, CircularProgress, Alert, TextField, Button, IconButton,
  Paper, Toolbar, AppBar, Menu, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, Chip, Tooltip, Fab,
  InputAdornment, Card, CardContent, Avatar, Drawer, List, ListItem, ListItemIcon,
  ListItemText, Divider, ButtonGroup
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import ClearIcon from '@mui/icons-material/Clear';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DescriptionIcon from '@mui/icons-material/Description';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import PanToolIcon from '@mui/icons-material/PanTool';
import MouseIcon from '@mui/icons-material/Mouse';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import MyLocationIcon from '@mui/icons-material/MyLocation';

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
  Panel,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import apiService from './services/api';
import ProcessNode from './components/ProcessNode';
import { getEdgeStyle, getConnectionLineStyle } from './utils/edgeStyles';
import CustomEdge from "./components/CustomEdge";

// Типы узлов
const nodeTypes = {
  processNode: ProcessNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

// Стили для различных типов связей - улучшенные для BPMN-подобного вида

export default function ProcessMapPage({ projectId, onBack, highlightedProcessId, onOpenProcess }) {
  const [processes, setProcesses] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [foundIds, setFoundIds] = useState([]);
  const [toolsDrawerOpen, setToolsDrawerOpen] = useState(false);
  const [selectedRelationType, setSelectedRelationType] = useState('one-to-one');
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  const connectionLineStyle = useMemo(() => getConnectionLineStyle(selectedRelationType), [selectedRelationType]);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [createProcessDialogOpen, setCreateProcessDialogOpen] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  const [isCreatingProcess, setIsCreatingProcess] = useState(false);
  
  // Состояние для диалога удаления процесса согласно ТЗ пункт 3.6
  const [deleteProcessDialogOpen, setDeleteProcessDialogOpen] = useState(false);
  const [processToDelete, setProcessToDelete] = useState(null);
  const [isDeletingProcess, setIsDeletingProcess] = useState(false);
  
  // Состояние для навигации по найденным процессам согласно ТЗ пункт 3.7
  const [currentFoundIndex, setCurrentFoundIndex] = useState(-1);

  // Используем правильные хуки ReactFlow
  const [nodes, setNodes, _onNodesChange] = useNodesState([]);

// Сохраняем позицию процесса при перемещении
  const onNodesChange = useCallback((changes) => {
    _onNodesChange(changes);
    console.log('onNodesChange', changes);
    changes.forEach(async (change) => {
      if (change.type === 'position' && change.position) {
        const nodeId = change.id;
        const { x, y } = change.position;
        try {
          await apiService.updateProcessPosition(nodeId, { position_x: x, position_y: y });
        } catch (e) {
          // Не блокируем UI, просто логируем ошибку
          console.error('Ошибка сохранения позиции процесса', nodeId, e);
        }
      }
    });
  }, []);

const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [procData, relData] = await Promise.all([
          apiService.getProcesses(projectId),
          apiService.getProcessRelations(projectId)
        ]);
        
        const procs = procData?.data || procData || [];
console.log('Загруженные процессы:', procs);
setProcesses(procs);
        setProcesses(procs);
        setRelations(relData || []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Ошибка загрузки процессов или связей');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Улучшенный поиск и навигация согласно ТЗ пункт 3.7
  useEffect(() => {
    if (!search.trim()) {
      setFoundIds([]);
      return;
    }
    
    const searchLower = search.toLowerCase();
    const found = processes.filter(proc => {
      // Поиск по нескольким буквам названия процесса
      const nameMatch = proc.name?.toLowerCase().includes(searchLower);
      
      // Поиск по автору процесса
      const authorMatch = proc.author?.toLowerCase().includes(searchLower);
      
      // Поиск по дате создания процесса (различные форматы)
      const createdDate = proc.created_at ? new Date(proc.created_at) : null;
      const updatedDate = proc.updated_at ? new Date(proc.updated_at) : null;
      
      let dateMatch = false;
      if (createdDate || updatedDate) {
        // Поиск по дате в различных форматах
        const dateFormats = [
          createdDate?.toLocaleDateString('ru-RU'), // дд.мм.гггг
          createdDate?.toLocaleDateString('en-US'), // мм/дд/гггг
          createdDate?.getFullYear().toString(), // год
          createdDate?.toLocaleDateString('ru-RU', { month: 'long' }), // месяц словом
          createdDate?.toLocaleDateString('ru-RU', { month: 'short' }), // месяц сокращенно
          updatedDate?.toLocaleDateString('ru-RU'),
          updatedDate?.toLocaleDateString('en-US'),
          updatedDate?.getFullYear().toString(),
          updatedDate?.toLocaleDateString('ru-RU', { month: 'long' }),
          updatedDate?.toLocaleDateString('ru-RU', { month: 'short' })
        ].filter(Boolean);
        
        dateMatch = dateFormats.some(format => 
          format?.toLowerCase().includes(searchLower)
        );
      }
      
      return nameMatch || authorMatch || dateMatch;
    }).map(proc => proc.id);
    
    setFoundIds(found);
  }, [search, processes]);

  // Создание новой связи через drag-and-drop
  const onConnect = useCallback(async (params) => {
    // Проверка на дубликаты связей
    const existingEdge = edges.find(e => 
      (e.source === params.source && e.target === params.target) ||
      (e.source === params.target && e.target === params.source)
    );
    
    if (existingEdge) {
      alert('Связь между этими процессами уже существует');
      return;
    }

    try {
      const newRelation = await apiService.createProcessRelation({
        project_id: projectId,
        from_process_id: params.source,
        to_process_id: params.target,
        relation_type: selectedRelationType
      });

      const newEdge = {
        ...params,
        id: String(newRelation.id),
        type: "custom",
        animated: selectedRelationType === "many-to-many",
        style: getEdgeStyle(selectedRelationType),
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: getEdgeStyle(selectedRelationType).stroke,
        },
        data: {
          onDelete: async (id) => {
            await apiService.deleteProcessRelation(id);
            setRelations(prev => prev.filter(r => String(r.id) !== String(id)));
          }
        }
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setRelations(prev => [...prev, newRelation]);
    } catch (error) {
      console.error('Error creating relation:', error);
      alert('Ошибка создания связи');
    }
  }, [edges, projectId, selectedRelationType]);

  // Обновление узлов и рёбер при изменении данных
  useEffect(() => {
    // Создание узлов процессов
    const newNodes = processes.map((proc, index) => {
      const isHighlighted = highlightedProcessId === proc.id;
      const isFound = foundIds.includes(proc.id);
      
      return {
        id: String(proc.id),
        type: 'processNode',
        position: {
          x: typeof proc.position_x === 'number' && !isNaN(proc.position_x)
            ? proc.position_x
            : (index % 4) * 300 + 50,
          y: typeof proc.position_y === 'number' && !isNaN(proc.position_y)
            ? proc.position_y
            : Math.floor(index / 4) * 200 + 50
        },
        data: {
          name: proc.name,
          author: proc.author,
          updated_at: proc.updated_at,
          highlighted: isHighlighted,
          found: isFound,
          onEdit: () => onOpenProcess && onOpenProcess(proc.id),
          onDelete: () => handleDeleteProcess(proc)
        },
        draggable: true,
      };
    });

    // Создание рёбер связей
    const newEdges = relations.map(rel => ({
      id: String(rel.id),
      source: String(rel.from_process_id),
      target: String(rel.to_process_id),
      type: "custom",
      animated: rel.relation_type === "many-to-many",
      style: getEdgeStyle(rel.relation_type),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: getEdgeStyle(rel.relation_type).stroke,
      },
      selected: String(rel.id) === selectedEdgeId,
      data: {
        onDelete: async (id) => {
          await apiService.deleteProcessRelation(id);
          setRelations(prev => prev.filter(r => String(r.id) !== String(id)));
        }
      }
    }));
    setNodes(newNodes);
    setEdges(newEdges);
  }, [processes, relations, foundIds, highlightedProcessId, onOpenProcess]);

  // Удаление связи по клику
  // Выделение связи при клике
  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedEdgeId(edge.id);
  }, []);

  // Обработчик клавиши Delete для удаления выделенной связи
  const handleKeyDown = useCallback((event) => {
    if (event.key === "Delete" && selectedEdgeId) {
      const edgeToDelete = edges.find(edge => edge.id === selectedEdgeId);
      if (edgeToDelete && edgeToDelete.data && edgeToDelete.data.onDelete) {
        edgeToDelete.data.onDelete(selectedEdgeId);
        setSelectedEdgeId(null);
      }
    }
  }, [selectedEdgeId, edges]);

  // Добавляем обработчик клавиш к документу
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
  // Обработчики для инструментов
  const handleClearSearch = () => {
    setSearch('');
    setFoundIds([]);
  };

  const handleFitView = useCallback(() => {
    // Эта функция будет вызвана через ref ReactFlow
  }, []);

  // Функция удаления процесса согласно ТЗ пункт 3.6
  const handleDeleteProcess = (process) => {
    setProcessToDelete(process);
    setDeleteProcessDialogOpen(true);
  };

  // Подтверждение удаления процесса
  const confirmDeleteProcess = async () => {
    if (!processToDelete) return;

    setIsDeletingProcess(true);
    try {
      // Удаляем процесс из базы данных
      await apiService.deleteProcess(processToDelete.id);
      
      // Обновляем локальное состояние согласно ТЗ:
      // - Удаляется только этот процесс
      // - Связанные с удаляемым процессом карточки остаются нетронутыми
      // - Удаляются только связи, в которых участвует удаляемый процесс
      setProcesses(prev => prev.filter(p => p.id !== processToDelete.id));
      setRelations(prev => prev.filter(r => 
        r.from_process_id !== processToDelete.id && r.to_process_id !== processToDelete.id
      ));
      
      // Закрываем диалог и очищаем состояние
      setDeleteProcessDialogOpen(false);
      setProcessToDelete(null);
      
    } catch (error) {
      console.error('Error deleting process:', error);
      alert('Ошибка удаления процесса');
    } finally {
      setIsDeletingProcess(false);
    }
  };

  // Создание нового процесса
  const handleCreateProcess = async () => {
    if (!newProcessName.trim()) return;

    setIsCreatingProcess(true);
    try {
      const newProcess = await apiService.createProcess({
        project_id: projectId,
        name: newProcessName,
        bpmn: null
      });

      // Добавляем новый процесс в состояние
      const processWithAuthor = {
        ...newProcess,
        name: newProcessName,
        author: newProcess.author,
        created_at: new Date().toISOString()
      };

      setProcesses(prev => [...prev, processWithAuthor]);
      
      // Закрываем диалог и очищаем форму
      setCreateProcessDialogOpen(false);
      setNewProcessName('');
      
      // Показываем уведомление об успехе
      alert(`Процесс "${newProcessName}" успешно создан!`);
      
    } catch (error) {
      console.error('Error creating process:', error);
      alert('Ошибка создания процесса');
    } finally {
      setIsCreatingProcess(false);
    }
  };

  // Функция для размещения нового процесса в свободном месте
  const getNewProcessPosition = () => {
    const existingPositions = nodes.map(node => node.position);
    const gridSize = 300;
    let x = 50, y = 50;
    
    // Ищем свободное место в сетке
    while (existingPositions.some(pos => 
      Math.abs(pos.x - x) < 100 && Math.abs(pos.y - y) < 100
    )) {
      x += gridSize;
      if (x > 1200) { // Переходим на новую строку
        x = 50;
        y += 200;
      }
    }
    
    return { x, y };
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={onBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <AccountTreeIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Карта процессов
          </Typography>

          {/* Поиск */}
          <TextField
            placeholder="Поиск процессов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ 
              mr: 2, 
              width: 300,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                '&.Mui-focused fieldset': { borderColor: 'white' },
              },
              '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.7)' }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch} sx={{ color: 'white' }}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {/* Кнопка инструментов */}
          <Button
            color="inherit"
            startIcon={<LinkIcon />}
            onClick={() => setToolsDrawerOpen(true)}
            sx={{ mr: 1 }}
          >
            Инструменты связей
          </Button>

          <IconButton 
            color="inherit" 
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            <MoreVertIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Основной контент */}
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <Box 
            display="flex" 
            alignItems="center" 
            justifyContent="center" 
            sx={{ height: '100%' }}
          >
            <CircularProgress sx={{ mr: 2 }} />
            <Typography>Загрузка карты процессов...</Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {!loading && !error && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            connectionLineStyle={connectionLineStyle}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            style={{ background: '#fafbfc' }}
          >
            <Background gap={16} color="#e0e0e0" />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                if (node.data?.highlighted) return '#1976d2';
                if (node.data?.found) return '#ffd600';
                return '#ddd';
              }}
              maskColor="rgba(255, 255, 255, 0.8)"
            />
            
            {/* Панель статистики */}
            <Panel position="top-left">
              <Card sx={{ p: 2, minWidth: 250 }}>
                <Typography variant="h6" gutterBottom>
                  Статистика
                </Typography>
                <Typography variant="body2">
                  Процессов: {processes.length}
                </Typography>
                <Typography variant="body2">
                  Связей: {relations.length}
                </Typography>
                
                {/* Результаты поиска согласно ТЗ пункт 3.7 */}
                {foundIds.length > 0 && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#fff3cd', borderRadius: 1, border: '1px solid #ffd600' }}>
                    <Typography variant="subtitle2" color="warning.dark" gutterBottom>
                      🔍 Результаты поиска
                    </Typography>
                    <Typography variant="body2" color="warning.main" gutterBottom>
                      Найдено процессов: {foundIds.length}
                    </Typography>
                    
                    {/* Навигация по найденным процессам */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Tooltip title="Предыдущий найденный процесс">
                        <IconButton 
                          size="small" 
                          disabled={foundIds.length === 0 || currentFoundIndex <= 0}
                          onClick={() => {
                            const newIndex = Math.max(0, currentFoundIndex - 1);
                            setCurrentFoundIndex(newIndex);
                            // Здесь можно добавить фокусировку на процессе
                          }}
                        >
                          <NavigateBeforeIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
                        {foundIds.length > 0 ? `${Math.max(1, currentFoundIndex + 1)} / ${foundIds.length}` : '0 / 0'}
                      </Typography>
                      
                      <Tooltip title="Следующий найденный процесс">
                        <IconButton 
                          size="small"
                          disabled={foundIds.length === 0 || currentFoundIndex >= foundIds.length - 1}
                          onClick={() => {
                            const newIndex = Math.min(foundIds.length - 1, currentFoundIndex + 1);
                            setCurrentFoundIndex(newIndex);
                            // Здесь можно добавить фокусировку на процессе
                          }}
                        >
                          <NavigateNextIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Центрировать на текущем найденном процессе">
                        <IconButton 
                          size="small"
                          disabled={foundIds.length === 0}
                          onClick={() => {
                            // Здесь можно добавить центрирование на текущем процессе
                            console.log('Центрирование на процессе:', foundIds[currentFoundIndex]);
                          }}
                        >
                          <MyLocationIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    {/* Показываем название текущего найденного процесса */}
                    {foundIds.length > 0 && currentFoundIndex >= 0 && currentFoundIndex < foundIds.length && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(255, 214, 0, 0.1)', borderRadius: 0.5 }}>
                        <Typography variant="caption" color="warning.dark">
                          Текущий: {processes.find(p => p.id === foundIds[currentFoundIndex])?.name || 'Неизвестно'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
                
                {/* Подсказки по поиску согласно ТЗ пункт 3.7 */}
                {search && foundIds.length === 0 && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#f8d7da', borderRadius: 1, border: '1px solid #f5c6cb' }}>
                    <Typography variant="caption" color="error.main">
                      Ничего не найдено по запросу "{search}"
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                      Попробуйте поиск по:
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      • Названию процесса
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      • Автору процесса
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      • Дате создания (год, месяц)
                    </Typography>
                  </Box>
                )}
              </Card>
            </Panel>

            {/* Легенда типов связей */}
            <Panel position="top-right">
              <Card sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Типы связей
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box 
                      sx={{ 
                        width: 20, 
                        height: 2, 
                        bgcolor: '#2196f3' 
                      }} 
                    />
                    <Typography variant="caption">Один к одному</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box 
                      sx={{ 
                        width: 20, 
                        height: 3, 
                        bgcolor: '#ff9800',
                        borderStyle: 'dashed',
                        borderWidth: '0 0 3px 0',
                        borderColor: '#ff9800'
                      }} 
                    />
                    <Typography variant="caption">Один ко многим</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box 
                      sx={{ 
                        width: 20, 
                        height: 4, 
                        bgcolor: '#f44336',
                        borderStyle: 'dashed',
                        borderWidth: '0 0 4px 0',
                        borderColor: '#f44336'
                      }} 
                    />
                    <Typography variant="caption">Многие ко многим</Typography>
                  </Box>
                </Box>
              </Card>
            </Panel>
          </ReactFlow>
        )}

        {/* Empty State */}
        {!loading && !error && processes.length === 0 && (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center"
            sx={{ height: '100%', p: 4 }}
          >
            <AccountTreeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Нет процессов для отображения
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
              Создайте процессы в проекте, чтобы увидеть их на карте процессов
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateProcessDialogOpen(true)}
              size="large"
            >
              Создать первый процесс
            </Button>
          </Box>
        )}

        {/* FAB для добавления процессов */}
        {!loading && !error && processes.length > 0 && (
          <Fab
            color="primary"
            aria-label="add process"
            onClick={() => setCreateProcessDialogOpen(true)}
            sx={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              zIndex: 1000
            }}
          >
            <AddIcon />
          </Fab>
        )}
      </Box>

      {/* Drawer с инструментами связей - улучшенная версия согласно ТЗ пункт 3.5 */}
      <Drawer
        anchor="left"
        open={toolsDrawerOpen}
        onClose={() => setToolsDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 350,
            p: 3
          }
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            Меню инструментов
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Элементы для создания связей между процессами
          </Typography>
        </Box>

        {/* Секция выбора типа связи */}
        <Card sx={{ mb: 3, p: 2, bgcolor: '#f8f9fa' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon color="primary" />
            Тип связи
          </Typography>
          
          <ButtonGroup 
            orientation="vertical" 
            fullWidth 
            variant="outlined"
            sx={{ mb: 2 }}
          >
            <Button
              variant={selectedRelationType === 'one-to-one' ? 'contained' : 'outlined'}
              onClick={() => setSelectedRelationType('one-to-one')}
              startIcon={<SwapHorizIcon />}
              sx={{ justifyContent: 'flex-start', py: 1.5 }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Один к одному
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Простая связь между процессами
                </Typography>
              </Box>
            </Button>
            
            <Button
              variant={selectedRelationType === 'one-to-many' ? 'contained' : 'outlined'}
              onClick={() => setSelectedRelationType('one-to-many')}
              startIcon={<CallSplitIcon />}
              sx={{ justifyContent: 'flex-start', py: 1.5 }}
              color="warning"
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Один ко многим
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Один процесс связан с несколькими
                </Typography>
              </Box>
            </Button>
            
            <Button
              variant={selectedRelationType === 'many-to-many' ? 'contained' : 'outlined'}
              onClick={() => setSelectedRelationType('many-to-many')}
              startIcon={<CallMergeIcon />}
              sx={{ justifyContent: 'flex-start', py: 1.5 }}
              color="error"
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Многие ко многим
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Сложная связь между группами процессов
                </Typography>
              </Box>
            </Button>
          </ButtonGroup>

          {/* Предварительный просмотр выбранного типа связи */}
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Предварительный просмотр:
            </Typography>
            <Box 
              sx={{ 
                height: 4, 
                borderRadius: 2,
                ...getEdgeStyle(selectedRelationType),
                background: `linear-gradient(90deg, ${getEdgeStyle(selectedRelationType).stroke} 0%, ${getEdgeStyle(selectedRelationType).stroke} 100%)`
              }} 
            />
          </Box>
        </Card>

        {/* Секция инструкций по drag-and-drop */}
        <Card sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DragIndicatorIcon color="primary" />
            Drag & Drop
          </Typography>
          
          <List dense>
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon>
                <TouchAppIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Создание связи"
                secondary="Перетащите от синей точки одного процесса к синей точке другого"
              />
            </ListItem>
            
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon>
                <MouseIcon color="secondary" />
              </ListItemIcon>
              <ListItemText 
                primary="Удаление связи"
                secondary="Кликните на линию связи и подтвердите удаление"
              />
            </ListItem>
            
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon>
                <PanToolIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Перемещение процесса"
                secondary="Перетащите карточку процесса в любое место на карте"
              />
            </ListItem>
          </List>
        </Card>

        {/* Секция дополнительных действий */}
        <Card sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Дополнительные действия
          </Typography>
          
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              setCreateProcessDialogOpen(true);
              setToolsDrawerOpen(false);
            }}
            sx={{ mb: 1 }}
          >
            Создать новый процесс
          </Button>
          
          <Button
            fullWidth
            variant="outlined"
            startIcon={<FitScreenIcon />}
            onClick={() => {
              // Здесь можно добавить функцию fitView для ReactFlow
              setToolsDrawerOpen(false);
            }}
            sx={{ mb: 1 }}
          >
            Вместить все проц��ссы
          </Button>
          
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={() => {
              setSearch('');
              setFoundIds([]);
              setToolsDrawerOpen(false);
            }}
            color="secondary"
          >
            Очистить поиск
          </Button>
        </Card>

        <Divider sx={{ my: 3 }} />

        {/* Информация о текущем состоянии */}
        <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Текущее состояние карты:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Процессов: {processes.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Связей: {relations.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Выбранный тип связи: {selectedRelationType}
          </Typography>
          {foundIds.length > 0 && (
            <Typography variant="body2" color="warning.main">
              • Найдено в поиске: {foundIds.length}
            </Typography>
          )}
        </Box>
      </Drawer>

      {/* Меню опций */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => setCreateProcessDialogOpen(true)}>
          <AddIcon sx={{ mr: 1 }} />
          Создать процесс
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <ZoomInIcon sx={{ mr: 1 }} />
          Увеличить
        </MenuItem>
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <ZoomOutIcon sx={{ mr: 1 }} />
          Уменьшить
        </MenuItem>
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <FitScreenIcon sx={{ mr: 1 }} />
          Вместить все
        </MenuItem>
      </Menu>

      {/* Диалог создания процесса */}
      <Dialog 
        open={createProcessDialogOpen} 
        onClose={() => setCreateProcessDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AddIcon color="primary" />
            Создать новый процесс
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Новый процесс будет создан без связей и размещен свободно на карте. 
            Вы сможете вручную установить связи с другими процессами.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Название процесса"
            fullWidth
            variant="outlined"
            value={newProcessName}
            onChange={(e) => setNewProcessName(e.target.value)}
            placeholder="Введите название процесса..."
            sx={{ mt: 1 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newProcessName.trim()) {
                handleCreateProcess();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setCreateProcessDialogOpen(false);
              setNewProcessName('');
            }}
            disabled={isCreatingProcess}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleCreateProcess} 
            variant="contained"
            disabled={!newProcessName.trim() || isCreatingProcess}
            startIcon={isCreatingProcess ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {isCreatingProcess ? 'Создание...' : 'Создать процесс'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог удаления процесса согласно ТЗ пункт 3.6 */}
      <Dialog 
        open={deleteProcessDialogOpen} 
        onClose={() => !isDeletingProcess && setDeleteProcessDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon color="error" />
            Удаление процесса
          </Box>
        </DialogTitle>
        <DialogContent>
          {processToDelete && (
            <>
              <Typography variant="body1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Вы действительно хотите удалить процесс "{processToDelete.name}"?
              </Typography>
              
              <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2">
                  <strong>Внимание!</strong> Согласно ТЗ пункт 3.6:
                </Typography>
                <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
                  <li>Будет удален только этот процесс</li>
                  <li>Связанные с ним процессы останутся нетронутыми</li>
                  <li>Все связи с этим процессом будут удалены</li>
                </Typography>
              </Alert>

              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Информация о процессе:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Название: {processToDelete.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Автор: {processToDelete.author || 'Неизвестно'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Дата изменения: {processToDelete.updated_at ? new Date(processToDelete.updated_at).toLocaleDateString() : 'Никогда'}
                </Typography>
                
                {/* Показываем количество связей, которые будут удалены */}
                {(() => {
                  const relatedConnections = relations.filter(r => 
                    r.from_process_id === processToDelete.id || r.to_process_id === processToDelete.id
                  );
                  return relatedConnections.length > 0 && (
                    <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                      • Связей для удаления: {relatedConnections.length}
                    </Typography>
                  );
                })()}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDeleteProcessDialogOpen(false);
              setProcessToDelete(null);
            }}
            disabled={isDeletingProcess}
          >
            Отмена
          </Button>
          <Button 
            onClick={confirmDeleteProcess} 
            variant="contained"
            color="error"
            disabled={isDeletingProcess}
            startIcon={isDeletingProcess ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {isDeletingProcess ? 'Удаление...' : 'Удалить процесс'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
