import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, Card, CardContent, CardActions,
  Grid, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, AppBar, Toolbar, IconButton, Menu, MenuItem,
  Avatar, Chip, Alert, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function ProjectsPage({ onSelectProject, onAdmin, user, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [anchorEl, setAnchorEl] = useState(null);
  const [projectMenuAnchor, setProjectMenuAnchor] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("http://localhost:4000/api/projects", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Токен недействителен, перенаправляем на логин
          localStorage.removeItem('token');
          window.location.reload();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Обрабатываем пагинированный ответ
      if (data && data.data && Array.isArray(data.data)) {
        setProjects(data.data); // Используем массив из поля data
      } else if (Array.isArray(data)) {
        setProjects(data); // Если это просто массив
      } else {
        console.error('API returned non-array data:', data);
        setProjects([]); // Устанавливаем пустой массив как fallback
        setError('Получены некорректные дан��ые от сервера');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]); // У��танавливаем пустой массив в случае ошибки
      setError('Ошибка загрузки проектов: ' + error.message);
    } finally {
      setLoading(false);
    }
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
      } else {
        const errorData = await response.json();
        setError('Ошибка создания проекта: ' + (errorData.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Ошибка создания проекта: ' + error.message);
    }
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProjectMenuClick = (event, project) => {
    event.stopPropagation();
    setProjectMenuAnchor(event.currentTarget);
    setSelectedProject(project);
  };

  const handleProjectMenuClose = () => {
    setProjectMenuAnchor(null);
    setSelectedProject(null);
  };

  const handleDeleteClick = () => {
    setProjectToDelete(selectedProject);
    setDeleteDialogOpen(true);
    handleProjectMenuClose();
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:4000/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
        fetchProjects(); // Обновляем список проектов
      } else {
        const errorData = await response.json();
        setError('Ошибка удаления проекта: ' + (errorData.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('Ошибка удаления проекта: ' + error.message);
    }
  };

  const cancelDeleteProject = () => {
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  // Убеждаемся, что projects всегда массив перед рендерингом
  const safeProjects = Array.isArray(projects) ? projects : [];

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
            disabled={loading}
          >
            Создать проект
          </Button>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading Indicator */}
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Загрузка проектов...
            </Typography>
          </Box>
        )}

        {/* Projects Grid */}
        {!loading && (
          <Grid container spacing={3}>
            {safeProjects.map((project) => (
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
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box display="flex" alignItems="center">
                        <FolderIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="h2">
                          {project.name}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleProjectMenuClick(e, project)}
                      >
                        <MoreVertIcon />
                      </IconButton>
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
        )}

        {/* Empty State */}
        {!loading && safeProjects.length === 0 && !error && (
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
        <DialogTitle>��оздать новый проект</DialogTitle>
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

      {/* Project Menu */}
      <Menu
        anchorEl={projectMenuAnchor}
        open={Boolean(projectMenuAnchor)}
        onClose={handleProjectMenuClose}
      >
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon sx={{ mr: 1 }} />
          Удалить проект
        </MenuItem>
      </Menu>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDeleteProject} maxWidth="sm" fullWidth>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить проект "{projectToDelete?.name}"? 
            Это действие удалит все бизнес-процессы и данные проекта. 
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteProject}>Отмена</Button>
          <Button 
            onClick={confirmDeleteProject} 
            variant="contained"
            color="error"
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}