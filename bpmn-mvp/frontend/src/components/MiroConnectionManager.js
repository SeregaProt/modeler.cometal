import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box } from '@mui/material';

// Менеджер соединений в стиле Miro.com
// Управляет созданием связей через drag-and-drop и Smart Diagramming
class MiroConnectionManager {
  constructor() {
    this.isConnecting = false;
    this.sourceNodeId = null;
    this.sourceHandleId = null;
    this.connectionPreview = null;
    this.onConnectionCreate = null;
    this.onConnectionCancel = null;
  }
  
  // Начать создание связи (как в Miro при клике на синюю точку)
  startConnection(sourceNodeId, sourceHandleId, onConnectionCreate, onConnectionCancel) {
    this.isConnecting = true;
    this.sourceNodeId = sourceNodeId;
    this.sourceHandleId = sourceHandleId;
    this.onConnectionCreate = onConnectionCreate;
    this.onConnectionCancel = onConnectionCancel;
    
    // Добавляем обработчики событий для отслеживания мыши
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Меняем курсор
    document.body.style.cursor = 'crosshair';
  }
  
  // Обработчик движения мыши (показываем предварительный просмотр связи)
  handleMouseMove = (event) => {
    if (!this.isConnecting) return;
    
    // Здесь можно добавить логику отображения предварительного просмотра связи
    // В Miro показывается пунктирная линия от источника до курсора мыши
  };
  
  // Обработчик отпускания мыши (завершение создания связи)
  handleMouseUp = (event) => {
    if (!this.isConnecting) return;
    
    // Проверяем, попали ли мы на другой узел
    const targetElement = document.elementFromPoint(event.clientX, event.clientY);
    const targetNode = this.findTargetNode(targetElement);
    
    if (targetNode && targetNode !== this.sourceNodeId) {
      // Создаем связь
      if (this.onConnectionCreate) {
        this.onConnectionCreate({
          source: this.sourceNodeId,
          target: targetNode,
          sourceHandle: this.sourceHandleId,
        });
      }
    } else {
      // Отменяем создание связи
      if (this.onConnectionCancel) {
        this.onConnectionCancel();
      }
    }
    
    this.endConnection();
  };
  
  // Обработчик нажатия клавиш (Escape для отмены)
  handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      if (this.onConnectionCancel) {
        this.onConnectionCancel();
      }
      this.endConnection();
    }
  };
  
  // Найти целевой узел по элементу DOM
  findTargetNode(element) {
    let current = element;
    while (current && current !== document.body) {
      // Ищем элемент с data-id (ReactFlow использует data-id для узлов)
      if (current.dataset && current.dataset.id) {
        console.log('Найден целевой узел:', current.dataset.id);
        return current.dataset.id;
      }
      // Также проверяем атрибут data-nodeid
      if (current.dataset && current.dataset.nodeId) {
        console.log('Найден целевой узел (nodeId):', current.dataset.nodeId);
        return current.dataset.nodeId;
      }
      // Проверяем класс react-flow__node
      if (current.classList && current.classList.contains('react-flow__node')) {
        const nodeId = current.getAttribute('data-id');
        if (nodeId) {
          console.log('Найден узел ReactFlow:', nodeId);
          return nodeId;
        }
      }
      current = current.parentElement;
    }
    console.log('Целевой узел не найден');
    return null;
  }
  
  // Завершить создание связи
  endConnection() {
    this.isConnecting = false;
    this.sourceNodeId = null;
    this.sourceHandleId = null;
    this.onConnectionCreate = null;
    this.onConnectionCancel = null;
    
    // Убираем обработчики событий
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Возвращаем курсор
    document.body.style.cursor = 'default';
  }
  
  // Проверить, идет ли сейчас создание связи
  isConnectionInProgress() {
    return this.isConnecting;
  }
}

// Создаем единственный экземпляр менеджера
const connectionManager = new MiroConnectionManager();

// React компонент для интеграции с менеджером соединений
export function useMiroConnectionManager() {
  const [isConnecting, setIsConnecting] = useState(false);
  
  const startConnection = useCallback((sourceNodeId, sourceHandleId, onConnectionCreate) => {
    setIsConnecting(true);
    
    connectionManager.startConnection(
      sourceNodeId,
      sourceHandleId,
      (connectionData) => {
        setIsConnecting(false);
        onConnectionCreate(connectionData);
      },
      () => {
        setIsConnecting(false);
      }
    );
  }, []);
  
  const cancelConnection = useCallback(() => {
    connectionManager.endConnection();
    setIsConnecting(false);
  }, []);
  
  return {
    isConnecting,
    startConnection,
    cancelConnection,
  };
}

export default connectionManager;