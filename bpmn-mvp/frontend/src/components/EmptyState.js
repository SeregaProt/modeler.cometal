import React from 'react';
import { Box, Typography, Button } from '@mui/material';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction
}) {
  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center"
      sx={{ mt: 8 }}
    >
      {Icon && <Icon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />}
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
        {description}
      </Typography>
      {actionText && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
        >
          {actionText}
        </Button>
      )}
    </Box>
  );
}