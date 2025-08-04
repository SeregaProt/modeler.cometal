import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Alert, AppBar, Toolbar, IconButton
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
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  
  // Состояние для создания связей
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null);

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

  // Функция создания связи
  const createConnection = useCallback(async (sourceNodeId, targetNodeId) => {
    console.log('🔗 СОЗДАНИЕ СВЯЗИ В API:', sourceNodeId, '->', targetNodeId);
    
    try {
      const requestData = {
        project_id: parseInt(projectId),
        from_process_id: parseInt(sourceNodeId),
        to_process_id: parseInt(targetNodeId),
        relation_type: 'one-to-one'
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
      };
      
      // Создаем полный объект связи для relations
      const fullRelation = {
        id: newRelation.id,
        from_process_id: parseInt(sourceNodeId),
        to_process_id: parseInt(targetNodeId),
        relation_type: 'one-to-one',
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

  // Обновление узлов при изменении данных
  useEffect(() => {
    console.log('🔄 Обновление узлов, процессов:', processes.length);
    
    const newNodes = processes.map((proc, index) => {
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
          isConnecting: isConnecting && connectionSource?.nodeId === String(proc.id),
          onEdit: () => onOpenProcess && onOpenProcess(proc.id),
          onStartConnection: handleStartConnection,
        },
        draggable: true,
      };
    });

    console.log('📍 Создано узлов:', newNodes.length);
    setNodes(newNodes);
  }, [processes, selectedNodeId, isConnecting, connectionSource, onOpenProcess, handleStartConnection]);

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

  // Обработчик клика по пустому месту
  const handlePaneClick = useCallback(() => {
    console.log('👆 Клик по пустому месту');
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    if (isConnecting) {
      setIsConnecting(false);
      setConnectionSource(null);
    }
  }, [isConnecting]);

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
            Карта процессов (Рабочая версия)
          </Typography>
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
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            style={{ background: '#fafbfc' }}
          >
            <Background gap={16} color="#e0e0e0" />
            <Controls />
          </ReactFlow>
        )}
      </Box>
    </Box>
  );
}