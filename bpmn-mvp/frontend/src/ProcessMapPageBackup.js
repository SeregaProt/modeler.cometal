import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Alert, TextField, Button, IconButton,
  AppBar, Toolbar, Menu, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Fab, InputAdornment, Card, Drawer, ButtonGroup
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import ClearIcon from '@mui/icons-material/Clear';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import DeleteIcon from '@mui/icons-material/Delete';

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
// import { useMiroConnectionManager } from './components/MiroConnectionManager';

// Типы узлов и связей
const nodeTypes = {
  processNode: ProcessNode,
};

const edgeTypes = {
  simple: SimpleEdge,
};

// Стили для различных типов связей
const getEdgeStyle = (relationType) => {
  switch (relationType) {
    case 'one-to-many':
      return {
        stroke: '#ff9800',
        strokeWidth: 2,
        strokeDasharray: '5,5',
      };
    case 'many-to-many':
      return {
        stroke: '#f44336',
        strokeWidth: 2,
        strokeDasharray: '8,4',
      };
    default: // one-to-one
      return {
        stroke: '#0073e6',
        strokeWidth: 2,
      };
  }
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

  // Простое состояние для создания связей
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null);

  // Состояние узлов и связей
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
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

  // Простая функция создания связи
  const handleStartConnection = useCallback((sourceNodeId, sourceHandleId) => {
    console.log('Начало создания связи:', { sourceNodeId, sourceHandleId });
    
    if (isConnecting) {
      // Если уже создаем связь, завершаем ее
      const targetNodeId = sourceNodeId;
      
      if (connectionSource && connectionSource.nodeId !== targetNodeId) {
        createConnection(connectionSource.nodeId, targetNodeId);
      }
      
      // Сбрасываем состояние
      setIsConnecting(false);
      setConnectionSource(null);
    } else {
      // Начинаем создание связи
      setIsConnecting(true);
      setConnectionSource({ nodeId: sourceNodeId, handleId: sourceHandleId });
    }
  }, [isConnecting, connectionSource, createConnection]);

  // Функция создания связи
  const createConnection = useCallback(async (sourceNodeId, targetNodeId) => {
    console.log('Создание связи между:', sourceNodeId, 'и', targetNodeId);
    
    try {
      // Проверяем, что связь не существует
      const existingEdge = edges.find(e => 
        (e.source === sourceNodeId && e.target === targetNodeId) ||
        (e.source === targetNodeId && e.target === sourceNodeId)
      );
      
      if (existingEdge) {
        console.warn('Связь уже существует');
        alert('Связь между этими процессами ��же существует');
        return;
      }

      console.log('Создание связи в API:', {
        project_id: projectId,
        from_process_id: sourceNodeId,
        to_process_id: targetNodeId,
        relation_type: selectedRelationType
      });

      // Создаем связь в API
      const newRelation = await apiService.createProcessRelation({
        project_id: projectId,
        from_process_id: sourceNodeId,
        to_process_id: targetNodeId,
        relation_type: selectedRelationType
      });

      console.log('Связь создана в API:', newRelation);

      // Добавляем связь на карту
      const newEdge = {
        id: String(newRelation.id),
        source: sourceNodeId,
        target: targetNodeId,
        type: 'simple',
        style: getEdgeStyle(selectedRelationType),
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: getEdgeStyle(selectedRelationType).stroke,
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
      
      console.log('Добавление связи на карту:', newEdge);
      
      setEdges(prev => {
        const newEdges = [...prev, newEdge];
        console.log('Новый список связей:', newEdges);
        return newEdges;
      });
      
      setRelations(prev => {
        const newRelations = [...prev, newRelation];
        console.log('Новый список отношений:', newRelations);
        return newRelations;
      });
      
    } catch (error) {
      console.error('Ошибка создания связи:', error);
      alert('Ошибка создания связи: ' + error.message);
    }
  }, [edges, projectId, selectedRelationType, setEdges]);

  // Функция отмены создания связи
  const cancelConnection = useCallback(() => {
    setIsConnecting(false);
    setConnectionSource(null);
  }, []);

  // Обновление узлов при изменении данных
  useEffect(() => {
    console.log('🔄 Обновление узлов, handleStartConnection:', typeof handleStartConnection);
    
    const newNodes = processes.map((proc, index) => {
      const isHighlighted = highlightedProcessId === proc.id;
      const isFound = foundIds.includes(proc.id);
      const isSelected = selectedNodeId === String(proc.id);
      
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
          onEdit: () => onOpenProcess && onOpenProcess(proc.id),
          onDelete: () => handleDeleteProcess(proc),
          onStartConnection: handleStartConnection,
        },
        draggable: true,
      };
    });

    console.log('🔄 Создано узлов:', newNodes.length, 'с onStartConnection:', newNodes[0]?.data?.onStartConnection ? 'есть' : 'нет');
    setNodes(newNodes);
  }, [processes, foundIds, highlightedProcessId, selectedNodeId, onOpenProcess, handleStartConnection]);

  // Обновление связей при изменении данных
  useEffect(() => {
    const newEdges = relations.map(rel => ({
      id: String(rel.id),
      source: String(rel.from_process_id),
      target: String(rel.to_process_id),
      type: 'simple',
      style: getEdgeStyle(rel.relation_type),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: getEdgeStyle(rel.relation_type).stroke,
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
    
    setEdges(newEdges);
  }, [relations, selectedEdgeId, setEdges]);

  // Обработчик выделения узла
  const handleNodeClick = useCallback((event, node) => {
    event.stopPropagation();
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  // Обработчик выделения связи
  const handleEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  // Обработчик клика по пустому месту
  const handlePaneClick = useCallback(() => {
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
      alert('Ошибка удаления процесса');
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
            Карта процессов (Miro Style)
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
            onNodesChange={onNodesChange}
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
              <Card sx={{ p: 2, minWidth: 200 }}>
                <Typography variant="h6" gutterBottom>Статистика</Typography>
                <Typography variant="body2">Процессов: {processes.length}</Typography>
                <Typography variant="body2">Связей: {relations.length}</Typography>
                {foundIds.length > 0 && (
                  <Typography variant="body2" color="warning.main">
                    Найдено: {foundIds.length}
                  </Typography>
                )}
                {isConnecting && (
                  <Typography variant="body2" color="primary.main">
                    Создание связи... (Esc для отмены)
                  </Typography>
                )}
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
              Нет процессов для отображ��ния
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
        sx={{ '& .MuiDrawer-paper': { width: 300, p: 3 } }}
      >
        <Typography variant="h6" gutterBottom>Инструменты связей</Typography>
        
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Тип связи:</Typography>
        <ButtonGroup orientation="vertical" fullWidth variant="outlined">
          <Button
            variant={selectedRelationType === 'one-to-one' ? 'contained' : 'outlined'}
            onClick={() => setSelectedRelationType('one-to-one')}
            startIcon={<SwapHorizIcon />}
          >
            Один к одному
          </Button>
          <Button
            variant={selectedRelationType === 'one-to-many' ? 'contained' : 'outlined'}
            onClick={() => setSelectedRelationType('one-to-many')}
            startIcon={<CallSplitIcon />}
            color="warning"
          >
            Один ко многим
          </Button>
          <Button
            variant={selectedRelationType === 'many-to-many' ? 'contained' : 'outlined'}
            onClick={() => setSelectedRelationType('many-to-many')}
            startIcon={<CallMergeIcon />}
            color="error"
          >
            Многие ко многим
          </Button>
        </ButtonGroup>

        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          <strong>Как создать связь:</strong>
          <br />1. Кликните на процесс для выделения (появятся синие точки)
          <br />2. Кликните на синюю точку соединения
          <br />3. Кликните на другой процесс для создания связи
          <br />
          <br /><strong>Для редактирования:</strong>
          <br />• Нажмите кнопку "Открыть" на карточке процесса
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