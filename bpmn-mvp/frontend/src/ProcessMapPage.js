import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Typography, CircularProgress, Alert, AppBar, Toolbar, IconButton, Card
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

import {
  ReactFlow,
  Background,
  Controls,
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
  return { stroke: '#2196f3', strokeWidth: 2 };
};

export default function ProcessMapPage({ projectId, onBack, highlightedProcessId, onOpenProcess }) {
  const [processes, setProcesses] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  
  // Состояние для создания связей
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null); // { nodeId, handleId }
  const [hoveredTarget, setHoveredTarget] = useState(null); // { nodeId, handleId }
  const [dragLine, setDragLine] = useState(null); // { startX, startY, endX, endY }

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const reactFlowWrapper = useRef(null);

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
    
    // Обрабатываем изменения позиций
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

  // Функция создания связи с сохранением выбранных handles
  const createConnection = useCallback(async (sourceNodeId, sourceHandle, targetNodeId, targetHandle) => {
    console.log('🔗 СОЗДАНИЕ СВЯЗИ:', sourceNodeId, sourceHandle, '->', targetNodeId, targetHandle);
    
    try {
      const requestData = {
        project_id: parseInt(projectId),
        from_process_id: parseInt(sourceNodeId),
        to_process_id: parseInt(targetNodeId),
        relation_type: 'one-to-one',
        source_handle: sourceHandle,
        target_handle: targetHandle
      };
      
      console.log('📤 Отправляем запрос на создание связи:', requestData);

      // Создаем связь в API
      const newRelation = await apiService.createProcessRelation(requestData);
      console.log('✅ Связь создана в API:', newRelation);

      // Добавляем связь на карту с правильными handles
      const newEdge = {
        id: String(newRelation.id),
        source: String(sourceNodeId),
        target: String(targetNodeId),
        sourceHandle: `${sourceHandle}-source`,
        targetHandle: `${targetHandle}-target`,
        type: 'simple',
        style: getEdgeStyle(),
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: getEdgeStyle().stroke,
        },
      };
      
      // Создаем полный объект связи для relations
      const fullRelation = {
        id: newRelation.id,
        from_process_id: parseInt(sourceNodeId),
        to_process_id: parseInt(targetNodeId),
        relation_type: 'one-to-one',
        source_handle: sourceHandle,
        target_handle: targetHandle,
        project_id: parseInt(projectId)
      };
      
      // Обновляем состояние
      setRelations(prev => [...prev, fullRelation]);
      setEdges(prev => [...prev, newEdge]);

      console.log('✅ Связь успешно создана!');
      
    } catch (error) {
      console.error('❌ ОШИБКА создания связи:', error);
      alert('❌ Ошибка создания связи: ' + error.message);
    }
  }, [projectId]);

  // Функция обновления handles связи
  const updateConnectionHandles = useCallback(async (edgeId, sourceHandle, targetHandle) => {
    console.log('🔄 ОБНОВЛЕНИЕ HANDLES СВЯЗИ:', edgeId, sourceHandle, '->', targetHandle);
    
    try {
      await apiService.updateProcessRelationHandles(edgeId, {
        source_handle: sourceHandle,
        target_handle: targetHandle
      });
      
      // Обновляем локальное состояние
      setRelations(prev => prev.map(rel => 
        String(rel.id) === edgeId 
          ? { ...rel, source_handle: sourceHandle, target_handle: targetHandle }
          : rel
      ));
      
      console.log('✅ Handles связи обновлены!');
      
    } catch (error) {
      console.error('❌ ОШИБКА обновления handles связи:', error);
      alert('❌ Ошибка обновления точек соединения: ' + error.message);
    }
  }, []);

  // Функция удаления связи
  const deleteConnection = useCallback(async (edgeId) => {
    console.log('🗑️ Удаление связи:', edgeId);
    
    try {
      await apiService.deleteProcessRelation(edgeId);
      
      // Удаляем связь из состояния
      setRelations(prev => prev.filter(rel => String(rel.id) !== edgeId));
      setEdges(prev => prev.filter(edge => edge.id !== edgeId));
      setSelectedEdgeId(null);
      
      console.log('✅ Связь успешно удалена');
    } catch (error) {
      console.error('❌ Ошибка удаления связи:', error);
      alert('❌ Ошибка удаления связи: ' + error.message);
    }
  }, []);

  // Обработчик начала создания связи
  const handleStartConnection = useCallback((sourceNodeId, sourceHandleId, event) => {
    console.log('🚀 Начинаем создание связи от узла:', sourceNodeId, 'точка:', sourceHandleId);
    
    setIsCreatingConnection(true);
    setConnectionSource({ nodeId: sourceNodeId, handleId: sourceHandleId });

    // Используем координаты курсора мыши в момент нажатия как начальную точку
    const startX = event.clientX;
    const startY = event.clientY;
    
    setDragLine({
      startX: startX,
      startY: startY,
      endX: event.clientX,
      endY: event.clientY
    });

    // Добавляем глобальные обработчики мыши
    const handleMouseMove = (e) => {
      // Обновляем позицию линии, начальная точка остается там, где был клик
      setDragLine({
        startX: startX,
        startY: startY,
        endX: e.clientX,
        endY: e.clientY
      });

      // Определяем узел под курсором
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      let targetNodeId = null;
      
      for (const element of elements) {
        const nodeElement = element.closest('[data-id]');
        if (nodeElement) {
          const nodeId = nodeElement.getAttribute('data-id');
          if (nodeId && nodeId !== sourceNodeId && processes.find(p => String(p.id) === nodeId)) {
            targetNodeId = nodeId;
            break;
          }
        }
      }
      
      if (targetNodeId) {
        // Устанавливаем целевой узел только если он изменился
        setHoveredTarget(prev => {
          if (!prev || prev.nodeId !== targetNodeId) {
            console.log('🎯 Новый целевой узел:', targetNodeId);
            return { nodeId: targetNodeId, handleId: 'top' };
          }
          return prev;
        });
      } else {
        // Убираем целевой узел
        setHoveredTarget(prev => {
          if (prev) {
            console.log('👋 Убираем целевой узел');
            return null;
          }
          return prev;
        });
      }
    };
    
    const handleMouseUp = (e) => {
      console.log('🏁 Завершаем drag связи');
      
      // Определяем финальный целевой узел
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      let finalTargetNodeId = null;
      
      for (const element of elements) {
        const nodeElement = element.closest('[data-id]');
        if (nodeElement) {
          const nodeId = nodeElement.getAttribute('data-id');
          if (nodeId && nodeId !== sourceNodeId && processes.find(p => String(p.id) === nodeId)) {
            finalTargetNodeId = nodeId;
            break;
          }
        }
      }
      
      if (finalTargetNodeId) {
        // Определяем ближайшую точку на целевом узле
        const targetElement = document.querySelector(`[data-id="${finalTargetNodeId}"]`);
        let targetHandle = 'top';
        
        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
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
        }
        
        console.log('✅ Создаем связь:', sourceNodeId, sourceHandleId, '->', finalTargetNodeId, targetHandle);
        createConnection(sourceNodeId, sourceHandleId, finalTargetNodeId, targetHandle);
      } else {
        console.log('❌ Drag завершен без целевого узла');
      }
      
      // Сбрасываем состояние
      setIsCreatingConnection(false);
      setConnectionSource(null);
      setHoveredTarget(null);
      setDragLine(null);
      
      // Убираем обработчики
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [createConnection, processes]);

  // Обработчик завершения создания связи на целевом узле
  const handleEndConnection = useCallback((targetNodeId, targetHandleId, event) => {
    console.log('🎯 Завершаем создание связи на узле:', targetNodeId, 'точка:', targetHandleId);
    
    if (isCreatingConnection && connectionSource && connectionSource.nodeId !== targetNodeId) {
      console.log('✅ Создаем связь:', connectionSource.nodeId, connectionSource.handleId, '->', targetNodeId, targetHandleId);
      createConnection(connectionSource.nodeId, connectionSource.handleId, targetNodeId, targetHandleId);
      
      // Сбрасываем состояние
      setIsCreatingConnection(false);
      setConnectionSource(null);
      setHoveredTarget(null);
      setDragLine(null);
    }
  }, [isCreatingConnection, connectionSource, createConnection]);

  // Обновление узлов при изменении данных - ТОЛЬКО когда действительно нужно
  useEffect(() => {
    if (processes.length === 0) return; // Не обновляем если нет процессов
    
    console.log('🔄 Обновление узлов, процессов:', processes.length);
    
    const newNodes = processes.map((proc, index) => {
      const isSelected = selectedNodeId === String(proc.id);
      const isTargetHovered = hoveredTarget && hoveredTarget.nodeId === String(proc.id);
      const isConnecting = isCreatingConnection && connectionSource?.nodeId === String(proc.id);
      
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
          isConnecting: isConnecting,
          isTargetHovered: isTargetHovered,
          isEdgeSelected: !!selectedEdgeId,
          onEdit: () => onOpenProcess && onOpenProcess(proc.id),
          onStartDrag: handleStartConnection,
          onEndDrag: handleEndConnection,
        },
        draggable: !isCreatingConnection, // Отключаем перетаскивание узлов во время создания связи
      };
    });

    console.log('📍 Создано узлов:', newNodes.length);
    setNodes(newNodes);
  }, [processes, selectedNodeId, isCreatingConnection, connectionSource, hoveredTarget]);

  // Обновление связей при изменении данных - используем сохраненные handles
  useEffect(() => {
    console.log('🔄 Обновление связей, отношений:', relations.length);
    
    const newEdges = relations.map(rel => {
      // Используем сохраненные handles из базы данных, если они есть
      let sourceHandle = `${rel.source_handle || 'right'}-source`;
      let targetHandle = `${rel.target_handle || 'left'}-target`;
      
      return {
        id: String(rel.id),
        source: String(rel.from_process_id),
        target: String(rel.to_process_id),
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
        type: 'simple',
        style: getEdgeStyle(),
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: getEdgeStyle().stroke,
        },
        selected: String(rel.id) === selectedEdgeId,
        data: {
          onDelete: deleteConnection,
          onUpdateHandles: updateConnectionHandles,
        },
      };
    });
    
    console.log('📍 Создано связей на карте:', newEdges.length);
    setEdges(newEdges);
  }, [relations, selectedEdgeId, deleteConnection, updateConnectionHandles]);

  // Обработчик выделения узла
  const handleNodeClick = useCallback((event, node) => {
    if (isCreatingConnection) return; // Игнорируем клики во время создания связи
    
    event.stopPropagation();
    console.log('👆 Клик по узлу:', node.id);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, [isCreatingConnection]);

  // Обработчик выделения связи
  const handleEdgeClick = useCallback((event, edge) => {
    if (isCreatingConnection) return; // Игнорируем клики во время создания связи
    
    event.stopPropagation();
    console.log('👆 Клик по связи:', edge.id);
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, [isCreatingConnection]);

  // Обработчик клика по пустому месту
  const handlePaneClick = useCallback(() => {
    if (isCreatingConnection) {
      // Отменяем создание связи
      console.log('❌ Отмена создания связи');
      setIsCreatingConnection(false);
      setConnectionSource(null);
      setHoveredTarget(null);
      setDragLine(null);
      return;
    }
    
    console.log('👆 Клик по пустому месту');
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [isCreatingConnection]);

  // Обработчик клавиш
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isCreatingConnection) {
          // Отменяем создание связи
          console.log('❌ Отмена создания связи по Escape');
          setIsCreatingConnection(false);
          setConnectionSource(null);
          setHoveredTarget(null);
          setDragLine(null);
        } else {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCreatingConnection]);

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
        </Toolbar>
      </AppBar>

      {/* Основной контент */}
      <Box 
        ref={reactFlowWrapper}
        sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}
      >
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
            deleteKeyCode={null} // Отключаем удаление по Delete
          >
            <Background gap={16} color="#e0e0e0" />
            <Controls />
            
            {/* Временная линия при перетаскивании связи */}
            {dragLine && (
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
                  x1={dragLine.startX}
                  y1={dragLine.startY}
                  x2={dragLine.endX}
                  y2={dragLine.endY}
                  stroke="#2196f3"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
                <circle
                  cx={dragLine.endX}
                  cy={dragLine.endY}
                  r="4"
                  fill="#2196f3"
                />
              </svg>
            )}
            
            {/* Панель статистики */}
            <Panel position="top-left">
              <Card sx={{ p: 2, minWidth: 250 }}>
                <Typography variant="h6" gutterBottom>Статистика</Typography>
                <Typography variant="body2">Процессов: {processes.length}</Typography>
                <Typography variant="body2">Связей: {relations.length}</Typography>
                {isCreatingConnection && (
                  <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    🔗 Создание связи... (Esc для отмены)
                    <br />Источник: {connectionSource?.nodeId} ({connectionSource?.handleId})
                    {hoveredTarget && <><br />Цель: {hoveredTarget.nodeId} ({hoveredTarget.handleId})</>}
                  </Typography>
                )}
                {selectedNodeId && (
                  <Typography variant="body2" color="info.main" sx={{ fontWeight: 'bold' }}>
                    📌 Выбран процесс: {selectedNodeId}
                  </Typography>
                )}
                {selectedEdgeId && (
                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold' }}>
                    🔗 Выбрана связь: {selectedEdgeId}
                    <br />💡 Перетащите концы связи для изменения точек соединения
                  </Typography>
                )}
              </Card>
            </Panel>
          </ReactFlow>
        )}
      </Box>
    </Box>
  );
}