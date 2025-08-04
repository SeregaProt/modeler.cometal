import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';

function TestConnection() {
  const [step, setStep] = useState(0);
  const [sourceNode, setSourceNode] = useState(null);
  
  const handleStartConnection = (nodeId) => {
    console.log('🎯 Начинаем создание связи от узла:', nodeId);
    setSourceNode(nodeId);
    setStep(1);
  };
  
  const handleCompleteConnection = (targetNodeId) => {
    console.log('🔗 Завершаем создание связи:', sourceNode, '->', targetNodeId);
    if (sourceNode && sourceNode !== targetNodeId) {
      console.log('✅ Связь создана между:', sourceNode, 'и', targetNodeId);
      alert(`Связь создана между ${sourceNode} и ${targetNodeId}`);
    }
    setStep(0);
    setSourceNode(null);
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Тест создания связей
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 2 }}>
        Шаг: {step === 0 ? 'Выберите первый процесс' : 'Выберите второй процесс'}
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant={sourceNode === 'A' ? 'contained' : 'outlined'}
          onClick={() => step === 0 ? handleStartConnection('A') : handleCompleteConnection('A')}
          sx={{ minWidth: 100, minHeight: 60 }}
        >
          Процесс A
        </Button>
        
        <Button
          variant={sourceNode === 'B' ? 'contained' : 'outlined'}
          onClick={() => step === 0 ? handleStartConnection('B') : handleCompleteConnection('B')}
          sx={{ minWidth: 100, minHeight: 60 }}
        >
          Процесс B
        </Button>
        
        <Button
          variant={sourceNode === 'C' ? 'contained' : 'outlined'}
          onClick={() => step === 0 ? handleStartConnection('C') : handleCompleteConnection('C')}
          sx={{ minWidth: 100, minHeight: 60 }}
        >
          Процесс C
        </Button>
      </Box>
      
      {step === 1 && (
        <Button
          variant="text"
          onClick={() => {
            setStep(0);
            setSourceNode(null);
          }}
          sx={{ mt: 2 }}
        >
          Отмена
        </Button>
      )}
    </Box>
  );
}

export default TestConnection;