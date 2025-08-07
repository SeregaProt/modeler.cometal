import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Avatar, Chip, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function AppHeader({ 
  title, 
  icon: Icon, 
  onBack, 
  user, 
  actions = [],
  subtitle 
}) {
  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        {onBack && (
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={onBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        
        {Icon && <Icon sx={{ mr: 1 }} />}
        
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {user && (
          <Chip 
            label={user.name} 
            avatar={<Avatar>{user.name[0]}</Avatar>}
            sx={{ mr: 2, bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
          />
        )}

        {actions.map((action, index) => (
          <IconButton 
            key={index}
            color="inherit" 
            onClick={action.onClick}
            sx={{ mr: index === actions.length - 1 ? 0 : 1 }}
          >
            {action.icon}
          </IconButton>
        ))}
      </Toolbar>
    </AppBar>
  );
}