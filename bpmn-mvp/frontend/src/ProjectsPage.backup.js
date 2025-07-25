import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, Card, CardContent, CardActions,
  Grid, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, AppBar, Toolbar, IconButton, Menu, MenuItem,
  Avatar, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import FolderIcon from '@mui/icons-material/Folder';

export default function ProjectsPage({ onSelectProject, onAdmin, user, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = () => {
    const token = localStorage.getItem('token');
    fetch("http://localhost:4000/api/projects", {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((r) => r.json())
      .then(setProjects)
      .catch(console.error);
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch("http://localhost:4000/api/projects", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newProject.name,
          description: newProject.description,
          created_by: user.id
        })
      });

      if (response.ok) {
        setOpen(false);
        setNewProject({ name: '', description: '' });
        fetchProjects();
      }
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            BPMN Моделер - Проекты
          </Typography>
          
          <Chip 
            label={user.name} 
            avatar={<Avatar>{user.name[0]}</Avatar>}
            sx={{ mr: 2, bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
          />
          
          <IconButton color="inherit" onClick={handleMenuClick}>
            <AccountCircleIcon />
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            {user.role === 'admin' && (
              <MenuItem onClick={() => { handleMenuClose(); onAdmin(); }}>
                <AdminPanelSettingsIcon sx={{ mr: 1 }} />
                Панель администратора
              </MenuItem>
            )}
            <MenuItem onClick={() => { handleMenuClose(); onLogout(); }}>
              <LogoutIcon sx={{ mr: 1 }} />
              Выход
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Мои проекты</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
          >
            Создать проект
          </Button>
        </Box>

        {/* Projects Grid */}
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': { elevation: 4 }
                }}
                onClick={() => onSelectProject(project.id)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <FolderIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h2">
                      {project.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {project.description || 'Нет описания'}
                  </Typography>
                  {project.created_at && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Создан: {new Date(project.created_at).toLocaleDateString()}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" color="primary">
                    Открыть проект
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {projects.length === 0 && (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center"
            sx={{ mt: 8 }}
          >
            <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Пока нет проектов
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Создайте свой первый проект для моделирования бизнес-процессов
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpen(true)}
            >
              Создать первый проект
            </Button>
          </Box>
        )}
      </Box>

      {/* Create Project Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать новый проект</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название проекта"
            fullWidth
            variant="outlined"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Описание (необязательно)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleCreateProject} 
            variant="contained"
            disabled={!newProject.name.trim()}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
