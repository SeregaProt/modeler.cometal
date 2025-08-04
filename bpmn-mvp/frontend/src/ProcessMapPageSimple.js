import React, { useEffect, useState, useCallback } from 'react';
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

// СУПЕР ПРОСТОЙ УЗЕЛ БЕЗ ВСЯКИХ СЛОЖНОСТЕЙ
function SimpleProcessNode({ data, selected, id }) {
  const handleConnectionClick = (e) => {
    e.stopPropagation();
    console.log('🔵 КЛИК ПО УЗЛУ ДЛЯ СВЯЗИ:', id);
    if (data.onStartConnection) {
      data.onStartConnection(id);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* ��ОЛЬШАЯ СИНЯЯ КНОПКА ДЛЯ СОЗДАНИЯ СВЯЗИ */}
      {selected && (
        <button
          onClick={handleConnectionClick}
          style={{
            position: 'absolute',
            top: -15,
            right: -15,
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: '#0073e6',
            border: '2px solid white',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            zIndex: 10,
          }}
        >
          +
        </button>
      )}
      
      {/* КАРТОЧКА ПРОЦЕССА */}
      <div style={{
        width: 200,
        padding: 16,
        background: selected ? '#f0f8ff' : 'white',
        border: selected ? '2px solid #0073e6' : '1px solid #ddd',
        borderRadius: 8,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#333' }}>
          {data.name}
        </h3>
        <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#666' }}>
          BPMN процесс
        </p>
      </div>
    </div>
  );
}

const nodeTypes = {
  simple: SimpleProcessNode,
};

export default function ProcessMapPageSimple({ projectId, onBack }) {
  const [processes, setProcesses] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  
  // СОСТОЯНИЕ ДЛЯ СОЗДАНИЯ СВЯЗЕЙ
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // ЗАГРУЗКА ДАННЫХ
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [procData, relData] = await Promise.all([
          apiService.getProcesses(projectId),
          apiService.getProcessRelations(projectId)
        ]);
        
        setProcesses(procData?.data || procData || []);
        setRelations(relData || []);
      } catch (err) {
        console.error('Error:', err);
        setError('Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  // ФУНКЦИЯ СОЗДАНИЯ СВЯЗИ
  const createConnection = useCallback(async (sourceId, targetId) => {
    console.log('🔗 СОЗДАЕМ СВЯЗЬ:', sourceId, '->', targetId);
    
    try {
      const newRelation = await apiService.createProcessRelation({
        project_id: projectId,
        from_process_id: sourceId,
        to_process_id: targetId,
        relation_type: 'one-to-one'
      });

      console.log('✅ СВЯЗЬ СОЗДАНА:', newRelation);

      // ДОБАВЛЯЕМ НА КАРТУ
      const newEdge = {
        id: String(newRelation.id),
        source: sourceId,
        target: targetId,
        style: { stroke: '#0073e6', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#0073e6' },
      };
      
      setEdges(prev => [...prev, newEdge]);
      setRelations(prev => [...prev, newRelation]);
      
      alert('✅ Связь создана!');
      
    } catch (error) {
      console.error('❌ ОШИБКА:', error);
      alert('❌ Ошибка: ' + error.message);
    }
  }, [projectId]);

  // ОБРАБОТЧИК СОЗДАНИЯ СВЯЗИ
  const handleStartConnection = useCallback((nodeId) => {
    console.log('🎯 НАЧАЛО СОЗДАНИЯ СВЯЗИ:', { nodeId, isConnecting, connectionSource });
    
    if (isConnecting && connectionSource) {
      // ЗАВЕРШАЕМ СОЗДАНИЕ СВЯЗИ
      if (connectionSource !== nodeId) {
        console.log('🔗 СОЗДАЕМ СВЯЗЬ МЕЖДУ:', connectionSource, 'и', nodeId);
        createConnection(connectionSource, nodeId);
      } else {
        console.log('❌ НЕЛЬЗЯ СВЯЗАТЬ С САМИМ СОБОЙ');
        alert('❌ Нельзя связать процесс с самим собой');
      }
      
      setIsConnecting(false);
      setConnectionSource(null);
    } else {
      // НАЧИНАЕМ СОЗДАНИЕ СВЯЗИ
      console.log('🎯 НАЧИНАЕМ СОЗДАНИЕ СВЯЗИ ОТ:', nodeId);
      setIsConnecting(true);
      setConnectionSource(nodeId);
    }
  }, [isConnecting, connectionSource, createConnection]);

  // ОБНОВЛЕНИЕ УЗЛОВ
  useEffect(() => {
    const newNodes = processes.map((proc, index) => ({
      id: String(proc.id),
      type: 'simple',
      position: {
        x: (index % 3) * 250 + 50,
        y: Math.floor(index / 3) * 150 + 50
      },
      selected: selectedNodeId === String(proc.id),
      data: {
        name: proc.name,
        onStartConnection: handleStartConnection,
      },
    }));
    
    setNodes(newNodes);
  }, [processes, selectedNodeId, handleStartConnection]);

  // ОБНОВЛЕНИЕ СВЯЗЕЙ
  useEffect(() => {
    const newEdges = relations.map(rel => ({
      id: String(rel.id),
      source: String(rel.from_process_id),
      target: String(rel.to_process_id),
      style: { stroke: '#0073e6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#0073e6' },
    }));
    
    setEdges(newEdges);
  }, [relations]);

  // КЛИК ПО УЗЛУ
  const handleNodeClick = useCallback((event, node) => {
    event.stopPropagation();
    console.log('👆 КЛИК ПО УЗЛУ:', node.id);
    setSelectedNodeId(node.id);
  }, []);

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" sx={{ height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Загрузка...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ЗАГОЛОВОК */}
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <AccountTreeIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            ПРОСТАЯ КАРТА ПРОЦЕССОВ
          </Typography>
        </Toolbar>
      </AppBar>

      {/* КАРТА */}
      <Box sx={{ flexGrow: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: '#f5f5f5' }}
        >
          <Background />
          <Controls />
          
          {/* ИНСТРУКЦИИ */}
          <Panel position="top-left">
            <Card sx={{ p: 2, maxWidth: 300 }}>
              <Typography variant="h6" gutterBottom>
                Как создать связь:
              </Typography>
              <Typography variant="body2">
                1. Кликните на процесс (появится синяя кнопка +)
                <br />
                2. Кликните на синюю кнопку +
                <br />
                3. Кликните на другой процесс
                <br />
                4. Кликните на его синюю кнопку +
              </Typography>
              
              {isConnecting && (
                <Typography variant="body2" color="primary" sx={{ mt: 2, fontWeight: 'bold' }}>
                  🔗 Создание связи... Выберите целевой процесс!
                </Typography>
              )}
              
              <Typography variant="body2" sx={{ mt: 2 }}>
                Процессов: {processes.length}
                <br />
                Связей: {relations.length}
              </Typography>
            </Card>
          </Panel>
        </ReactFlow>
      </Box>
    </Box>
  );
}