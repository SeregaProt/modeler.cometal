import React from 'react';
import { Button, Box, Typography, Alert } from '@mui/material';
import { clearInvalidToken, isTokenValid } from '../utils/auth';

export default function TokenDebugger() {
  const token = localStorage.getItem('token');
  const isValid = isTokenValid(token);

  const handleClearToken = () => {
    clearInvalidToken();
  };

  if (!token) {
    return null;
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}>
      <Alert 
        severity={isValid ? "success" : "error"} 
        action={
          !isValid && (
            <Button color="inherit" size="small" onClick={handleClearToken}>
              Очистить токен
            </Button>
          )
        }
      >
        <Typography variant="caption">
          Токен: {isValid ? "Действителен" : "Недействителен"}
        </Typography>
      </Alert>
    </Box>
  );
}