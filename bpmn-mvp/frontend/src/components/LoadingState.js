import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingState({ message = 'Загрузка...' }) {
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      sx={{ py: 4 }}
    >
      <CircularProgress />
      <Typography variant="body1" sx={{ ml: 2 }}>
        {message}
      </Typography>
    </Box>
  );
}