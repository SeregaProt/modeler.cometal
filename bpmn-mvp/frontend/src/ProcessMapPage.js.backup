import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Alert, TextField, Button, IconButton,
  AppBar, Toolbar, Menu, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Fab, InputAdornment, Card, Drawer
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import ClearIcon from '@mui/icons-material/Clear';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import apiService from './services/api';
import ProcessNode from './components/ProcessNode';
import SimpleEdge from './components/SimpleEdge';

const nodeTypes = {
  processNode: ProcessNode,
};

const edgeTypes = {
  simple: SimpleEdge,
};

const getEdgeStyle = () => {
  return { stroke: '#0073e6', strokeWidth: 2 };
};

export default function ProcessMapPage({ projectId, onBack, highlightedProcessId, onOpenProcess }) {
  const [processes, setProcesses] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [foundIds, setFoundIds] = useState([]);
  const [toolsDrawerOpen, setToolsDrawerOpen] = useState(false);
  const [selectedRelationType, setSelectedRelationType] = useState('one-to-one');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  
  // Диалоги
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [createProcessDialogOpen, setCreateProcessDialogOpen] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  const [isCreatingProcess, setIsCreatingProcess] = useState(false);
  const [deleteProcessDialogOpen, setDeleteProcessDialogOpen] = useState(false);
  const [processToDelete, setProcessToDelete] = useState(null);
  const [isDeletingProcess, setIsDeletingProcess] = useState(false);

  // Состояние для создания связей с drag-and-drop
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Функция сохранения позиции процесса
  const saveProcessPosition = useCallback(async (processId, position) => {
    try {
      await apiService.updateProcessPosition(processId, {
        position_x: position.x,
        position_y: position.y
      });
      console.log('💾 Позиция процесса сохранена:', processId, position);
    } catch (error) {
      console.error('❌ Ошибка сохранения позиции:', error);
    }
  }, []);

  // Обработчик изменения узлов с сохранением позиций
  const handleNodesChange = useCallback((changes) => {
    console.log('🔄 Изменения узлов:', changes);
    
    // Обрабатываем измен��ния позиций
    changes.forEach(change => {
      if (change.type === 'position' && change.position && change.dragging === false) {
        // Сохраняем позицию только когда перетаскивание завершено
        console.log('💾 Сохраняем позицию узла:', change.id, change.position);
        saveProcessPosition(change.id, change.position);
        
        // Обновляем локальное состояние процессов
        setProcesses(prev => prev.map(proc => 
          String(proc.id) === change.id 
            ? { ...proc, position_x: change.position.x, position_y: change.position.y }
            : proc
        ));
      }
    });
    
    // Применяем изменения к узлам
    onNodesChange(changes);
  }, [onNodesChange, saveProcessPosition]);

  // Подавление ошибки ResizeObserver (известная проблема ReactFlow)
  useEffect(() => {
    const handleResizeObserverError = (e) => {
      if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
        e.stopImmediatePropagation();
        return false;
      }
    };

    window.addEventListener('error', handleResizeObserverError);
    return () => window.removeEventListener('error', handleResizeObserverError);
  }, []);

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('🔄 Загружаем данные для проекта:', projectId);
        
        const [procData, relData] = await Promise.all([
          apiService.getProcesses(projectId),
          apiService.getProcessRelations(projectId)
        ]);
        
        console.log('📊 Получены процессы:', procData);
        console.log('🔗 Получены связи:', relData);
        
        const procs = procData?.data || procData || [];
        setProcesses(procs);
        setRelations(relData || []);
      } catch (err) {
        console.error('❌ Ошибка загрузки данных:', err);
        setError('Ошибка загрузки процессов или связей: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Поиск процессов
  useEffect(() => {
    if (!search.trim()) {
      setFoundIds([]);
      return;
    }
    
    const searchLower = search.toLowerCase();
    const found = processes.filter(proc => {
      const nameMatch = proc.name?.toLowerCase().includes(searchLower);
      const authorMatch = proc.author?.toLowerCase().includes(searchLower);
      return nameMatch || authorMatch;
    }).map(proc => proc.id);
    
    setFoundIds(found);
  }, [search, processes]);

  // Функция создания связи
  const createConnection = async (sourceNodeId, targetNodeId) => {
    console.log('🔗 СОЗДАНИЕ СВЯЗИ В API:', sourceNodeId, '->', targetNodeId);
    
    try {
      // Проверяем, что связь не существует
      const existingEdge = edges.find(e => 
        (e.source === sourceNodeId && e.target === targetNodeId) ||
        (e.source === targetNodeId && e.target === sourceNodeId)
      );
      
      if (existingEdge) {
        console.warn('⚠️ Связь уже существует');
        alert('⚠️ Связь между этими процессами уже существует');
        return;
      }

      const requestData = {
        project_id: projectId,
        from_process_id: sourceNodeId,
        to_process_id: targetNodeId,
        relation_type: selectedRelationType
      };
      
      console.log('📤 Отправляем запрос на создание связи:', requestData);

      // Создаем связь в API
      const newRelation = await apiService.createProcessRelation(requestData);

      console.log('✅ Связь создана в API:', newRelation);

      // Добавляем связь на карту
      const newEdge = {
        id: String(newRelation.id),
        source: String(sourceNodeId),
        target: String(targetNodeId),
        type: 'simple',
        style: getEdgeStyle(),
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: getEdgeStyle().stroke,
        },
        data: {
          relationType: selectedRelationType,
          onDelete: async (id) => {
            try {
              await apiService.deleteProcessRelation(id);
              setRelations(prev => prev.filter(r => String(r.id) !== String(id)));
            } catch (error) {
              console.error('Ошибка удаления связи:', error);
            }
          }
        }
      };
      
      // Создаем полный объект связи для relations
      const fullRelation = {
        id: newRelation.id,
        from_process_id: sourceNodeId,
        to_process_id: targetNodeId,
        relation_type: selectedRelationType,
        project_id: projectId
      };
      
      // Обновляем состояние
      setRelations(prev => [...prev, fullRelation]);
      setEdges(prev => [...prev, newEdge]);

      console.log('✅ Связь успешно со��дана!');
      
    } catch (error) {
      console.error('❌ ОШИБКА создания связи:', error);
      alert('❌ Ошибка создания связи: ' + error.message);
    }
  };

  // Обработчик начала drag-and-drop связи
  const handleStartDrag = useCallback((sourceNodeId, sourceHandleId, event) => {
    console.log('🚀 Начинаем drag-and-drop связи:', { sourceNodeId, sourceHandleId });
    
    setIsConnecting(true);
    setIsDragging(true);
    setConnectionSource({ nodeId: sourceNodeId, handleId: sourceHandleId });
    
    const rect = event.currentTarget.getBoundingClientRect();
    setDragPosition({ x: rect.left, y: rect.top });
    
    // Добавляем глобальные обработчики мыши
    const handleMouseMove = (e) => {
      setDragPosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseUp = (e) => {
      console.log('🏁 Завершаем drag-and-drop');
      setIsDragging(false);
      
      // Проверяем, над каким узлом мы находимся
      if (hoveredNodeId && hoveredNodeId !== sourceNodeId) {
        console.log('✅ Создаем связь через drag-and-drop:', sourceNodeId, '->', hoveredNodeId);
        createConnection(sourceNodeId, hoveredNodeId);
      }
      
      // Убираем обработчики
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Сбрасываем состояние
      setTimeout(() => {
        setIsConnecting(false);
        setConnectionSource(null);
        setHoveredNodeId(null);
      }, 100);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [hoveredNodeId, createConnection]);

  // Обработчик наведения на узел во время drag
  const handleNodeMouseEnter = useCallback((nodeId) => {
    if (isDragging && connectionSource && nodeId !== connectionSource.nodeId) {
      console.log('🎯 Наводим на узел во время drag:', nodeId);
      setHoveredNodeId(nodeId);
    }
  }, [isDragging, connectionSource]);

  // Обработчик ухода с узла во время drag
  const handleNodeMouseLeave = useCallback((nodeId) => {
    if (isDragging && hoveredNodeId === nodeId) {
      console.log('👋 Уходим с узла во время drag:', nodeId);
      setHoveredNodeId(null);
    }
  }, [isDragging, hoveredNodeId]);

  // Функция создания связи (клик)
  const handleStartConnection = useCallback((sourceNodeId, sourceHandleId) => {
    console.log('🎯 КЛИК ПО ТОЧКЕ СОЕДИНЕНИЯ:', { 
      sourceNodeId, 
      sourceHandleId, 
      isConnecting, 
      connectionSource 
    });
    
    if (isConnecting && connectionSource) {
      // Завершаем создание связи
      const targetNodeId = sourceNodeId;
      console.log('🔗 ЗАВЕРШАЕМ создание связи:', connectionSource.nodeId, '->', targetNodeId);
      
      if (connectionSource.nodeId !== targetNodeId) {
        console.log('✅ Создаем связь между РАЗНЫМИ узлами');
        createConnection(connectionSource.nodeId, targetNodeId);
      } else {
        console.log('❌ Нельзя связать узел с самим собой');
        alert('❌ Нельзя связать процесс с самим собой');
      }
      
      // Сбрасываем состояние
      setIsConnecting(false);
      setConnectionSource(null);
    } else {
      // Начинаем создание связи
      console.log('🎯 НАЧИНАЕМ создание связи от узла:', sourceNodeId);
      setIsConnecting(true);
      setConnectionSource({ nodeId: sourceNodeId, handleId: sourceHandleId });
    }
  }, [isConnecting, connectionSource, createConnection]);

  // Функция отмены создания связи
  const cancelConnection = useCallback(() => {
    console.log('❌ Отмена создания связи');
    setIsConnecting(false);
    setConnectionSource(null);
    setIsDragging(false);
    setHoveredNodeId(null);
  }, []);

  // Обновление узлов при изменении данных
  useEffect(() => {
    console.log('🔄 Обновление узлов, процессов:', processes.length);
    
    const newNodes = processes.map((proc, index) => {
      const isHighlighted = highlightedProcessId === proc.id;
      const isFound = foundIds.includes(proc.id);
      const isSelected = selectedNodeId === String(proc.id);
      const isHovered = hoveredNodeId === String(proc.id);
      
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
        selected: isSelected,
        data: {
          name: proc.name,
          author: proc.author,
          updated_at: proc.updated_at,
          highlighted: isHighlighted,
          found: isFound,
          isConnecting: isConnecting && connectionSource?.nodeId === String(proc.id),
          showHoverPoints: isHovered && isDragging,
          onEdit: () => onOpenProcess && onOpenProcess(proc.id),
          onDelete: () => handleDeleteProcess(proc),
          onStartConnection: handleStartConnection,
          onStartDrag: handleStartDrag,
          onMouseEnter: () => handleNodeMouseEnter(String(proc.id)),
          onMouseLeave: () => handleNodeMouseLeave(String(proc.id)),
        },
        draggable: true,
      };
    });

    console.log('📍 Создано узлов:', newNodes.length);
    setNodes(newNodes);
  }, [processes, foundIds, highlightedProcessId, selectedNodeId, hoveredNodeId, isDragging, onOpenProcess, handleStartConnection, handleStartDrag, handleNodeMouseEnter, handleNodeMouseLeave, isConnecting, connectionSource]);

  // Обновление связей при изменении данных
  useEffect(() => {
    console.log('🔄 Обновление связей, отношений:', relations.length);
    
    const newEdges = relations.map(rel => ({
      id: String(rel.id),
      source: String(rel.from_process_id),
      target: String(rel.to_process_id),
      type: 'simple',
      style: getEdgeStyle(),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: getEdgeStyle().stroke,
      },
      selected: String(rel.id) === selectedEdgeId,
      data: {
        relationType: rel.relation_type,
        onDelete: async (id) => {
          try {
            await apiService.deleteProcessRelation(id);
            setRelations(prev => prev.filter(r => String(r.id) !== String(id)));
          } catch (error) {
            console.error('Ошибка удаления связи:', error);
          }
        }
      }
    }));
    
    console.log('📍 Создано связей на карте:', newEdges.length);
    setEdges(newEdges);
  }, [relations, selectedEdgeId]);

  // Обработчик выделения узла
  const handleNodeClick = useCallback((event, node) => {
    event.stopPropagation();
    console.log('👆 Клик по узлу:', node.id);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  // Обработчик выделения связи
  const handleEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    console.log('👆 Клик по связи:', edge.id);
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  // Обработчик клика по пустому месту
  const handlePaneClick = useCallback(() => {
    console.log('👆 Клик по пустому месту');
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    if (isConnecting) {
      cancelConnection();
    }
  }, [isConnecting, cancelConnection]);

  // Обработчик клавиш
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Delete' && selectedEdgeId) {
        const edgeToDelete = edges.find(edge => edge.id === selectedEdgeId);
        if (edgeToDelete && edgeToDelete.data && edgeToDelete.data.onDelete) {
          edgeToDelete.data.onDelete(selectedEdgeId);
          setSelectedEdgeId(null);
        }
      }
      if (event.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        if (isConnecting) {
          cancelConnection();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId, edges, isConnecting, cancelConnection]);

  // Функции для работы с процессами
  const handleDeleteProcess = (process) => {
    setProcessToDelete(process);
    setDeleteProcessDialogOpen(true);
  };

  const confirmDeleteProcess = async () => {
    if (!processToDelete) return;

    setIsDeletingProcess(true);
    try {
      await apiService.deleteProcess(processToDelete.id);
      setProcesses(prev => prev.filter(p => p.id !== processToDelete.id));
      setRelations(prev => prev.filter(r => 
        r.from_process_id !== processToDelete.id && r.to_process_id !== processToDelete.id
      ));
      setDeleteProcessDialogOpen(false);
      setProcessToDelete(null);
    } catch (error) {
      console.error('Error deleting process:', error);
      alert('Ошибка уда��ения процесса');
    } finally {
      setIsDeletingProcess(false);
    }
  };

  const handleCreateProcess = async () => {
    if (!newProcessName.trim()) return;

    setIsCreatingProcess(true);
    try {
      const newProcess = await apiService.createProcess({
        project_id: projectId,
        name: newProcessName,
        bpmn: null
      });

      setProcesses(prev => [...prev, {
        ...newProcess,
        name: newProcessName,
        author: newProcess.author,
        created_at: new Date().toISOString()
      }]);
      
      setCreateProcessDialogOpen(false);
      setNewProcessName('');
    } catch (error) {
      console.error('Error creating process:', error);
      alert('Ошибка создания процесса');
    } finally {
      setIsCreatingProcess(false);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onBack} sx={{ mr: 2 }}>
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
                  <IconButton size="small" onClick={() => setSearch('')} sx={{ color: 'white' }}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <Button
            color="inherit"
            startIcon={<LinkIcon />}
            onClick={() => setToolsDrawerOpen(true)}
            sx={{ mr: 1 }}
          >
            Инструменты
          </Button>

          <IconButton color="inherit" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreVertIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Основной контент */}
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <Box display="flex" alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
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
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            style={{ background: '#fafbfc' }}
          >
            <Background gap={16} color="#e0e0e0" />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                if (node.data?.highlighted) return '#0073e6';
                if (node.data?.found) return '#ffd600';
                return '#ddd';
              }}
              maskColor="rgba(255, 255, 255, 0.8)"
            />
            
            {/* Панель статистики */}
            <Panel position="top-left">
              <Card sx={{ p: 2, minWidth: 250 }}>
                <Typography variant="h6" gutterBottom>Статистика</Typography>
                <Typography variant="body2">Процессов: {processes.length}</Typography>
                <Typography variant="body2">Связей: {relations.length}</Typography>
                {foundIds.length > 0 && (
                  <Typography variant="body2" color="warning.main">
                    Найдено: {foundIds.length}
                  </Typography>
                )}
                {isConnecting && (
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    🔗 Создание связи... (Esc для отмены)
                    <br />Источник: {connectionSource?.nodeId}
                  </Typography>
                )}
                {isDragging && (
                  <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 'bold' }}>
                    🖱️ Перетаскивание связи...
                  </Typography>
                )}
              </Card>
            </Panel>

            {/* Временная линия при drag-and-drop */}
            {isDragging && connectionSource && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 1000,
                }}
              >
                <line
                  x1={dragPosition.x}
                  y1={dragPosition.y}
                  x2={dragPosition.x}
                  y2={dragPosition.y}
                  stroke="#0073e6"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              </svg>
            )}
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
            onClick={() => setCreateProcessDialogOpen(true)}
            sx={{ position: 'absolute', bottom: 24, right: 24, zIndex: 1000 }}
          >
            <AddIcon />
          </Fab>
        )}
      </Box>

      {/* Drawer с инструментами */}
      <Drawer
        anchor="left"
        open={toolsDrawerOpen}
        onClose={() => setToolsDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 350, p: 3 } }}
      >
        <Typography variant="h6" gutterBottom>🔗 Инструменты связей</Typography>

        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          <strong>🎯 Создание связей (как в Miro):</strong>
          <br />
          <br /><strong>Способ 1 - Drag & Drop:</strong>
          <br />1. Кликните на процесс для выделения
          <br />2. Зажмите синюю точку и тяните к другому процессу
          <br />3. При наведении на целевой процесс появятся синие точки
          <br />4. Отпустите на любой синей точке для создания связи
          <br />
          <br /><strong>Способ 2 - Клики:</strong>
          <br />1. Кликните на синюю точку первого процесса
          <br />2. Кликните на синюю точку второго процесса
          <br />
          <br /><strong>🎛️ Управление:</strong>
          <br />• Удаление связи: выделите связь → Delete
          <br />• Отмена создания: Esc
          <br />• Перемещение процессов: просто перетаскивайте
          <br />
          <br /><strong>💡 Подсказки:</strong>
          <br />• Синие точки появляю��ся при выделении процесса
          <br />• При перетаскивании связи целевые точки подсвечиваются
          <br />• Позиции процессов сохраняются автоматически
        </Typography>
      </Drawer>

      {/* Меню опций */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => setCreateProcessDialogOpen(true)}>
          <AddIcon sx={{ mr: 1 }} />
          Создать процесс
        </MenuItem>
      </Menu>

      {/* Диалог создания процесса */}
      <Dialog open={createProcessDialogOpen} onClose={() => setCreateProcessDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать новый процесс</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название процесса"
            fullWidth
            variant="outlined"
            value={newProcessName}
            onChange={(e) => setNewProcessName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newProcessName.trim()) {
                handleCreateProcess();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateProcessDialogOpen(false)} disabled={isCreatingProcess}>
            Отмена
          </Button>
          <Button 
            onClick={handleCreateProcess} 
            variant="contained"
            disabled={!newProcessName.trim() || isCreatingProcess}
          >
            {isCreatingProcess ? 'Создание...' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог удаления процесса */}
      <Dialog open={deleteProcessDialogOpen} onClose={() => !isDeletingProcess && setDeleteProcessDialogOpen(false)}>
        <DialogTitle>Удаление процесса</DialogTitle>
        <DialogContent>
          {processToDelete && (
            <Typography>
              Вы действительно хотите удалить процесс "{processToDelete.name}"?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteProcessDialogOpen(false)} disabled={isDeletingProcess}>
            Отмена
          </Button>
          <Button onClick={confirmDeleteProcess} variant="contained" color="error" disabled={isDeletingProcess}>
            {isDeletingProcess ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}