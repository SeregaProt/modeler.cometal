import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Card, CardContent,
  IconButton, InputAdornment, Dialog, DialogTitle,
  DialogContent, DialogActions, Autocomplete, Chip, Menu, MenuItem,
  Grid, Drawer, List, ListItem,
  ListItemAvatar, ListItemText, Divider, Tooltip, Alert, Avatar,
  AppBar, Toolbar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import FolderIcon from '@mui/icons-material/Folder';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Импорт компонентов и утилит
import apiService from './services/api';
import { ensureArray, safeFilter, safeFind } from './utils/arrayHelpers';
import AppHeader from './components/AppHeader';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import ConfirmDialog from './components/ConfirmDialog';
import { useErrorHandler } from './hooks/useErrorHandler';

export default function ProjectPage({ projectId, goHome, onOpenProcess, onOpenProcessMap, user }) {
  const [processes, setProcesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [project, setProject] = useState({ name: '' });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [processToDelete, setProcessToDelete] = useState(null);

  const { error, loading, setLoading, clearError, withErrorHandling } = useErrorHandler();

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = withErrorHandling(async () => {
    // Используем новый API сервис
    const [processesData, usersData, projectsData, allUsersData] = await Promise.all([
      apiService.getProcesses(projectId),
      apiService.getProjectUsers(projectId),
      apiService.getProjects(),
      apiService.getUsers()
    ]);

    // Безопасная обработка данных с учетом пагинации
    const processesList = processesData?.data || processesData;
    setProcesses(ensureArray(processesList));
    
    setUsers(ensureArray(usersData));
    setAllUsers(ensureArray(allUsersData));

    // Поиск проекта с учетом пагинации
    const projectsList = projectsData?.data || projectsData;
    const foundProject = safeFind(ensureArray(projectsList), p => p.id === projectId);
    setProject(foundProject || { name: 'Неизвестный проект' });
  }, 'fetchData');

  const handleCreateProcess = withErrorHandling(async () => {
    if (!newProcessName.trim()) return;

    await apiService.createProcess({
      project_id: projectId,
      name: newProcessName,
      bpmn: null
    });
    setCreateDialogOpen(false);
    setNewProcessName('');
    fetchData();
  }, 'handleCreateProcess');

  const handleAddUsers = withErrorHandling(async () => {
    // Добавляем пользователей параллельно
    await Promise.all(
      selectedUsers.map(selectedUser =>
        apiService.assignUserToProject(projectId, selectedUser.id)
      )
    );

    setAddUserDialogOpen(false);
    setSelectedUsers([]);
    fetchData();
  }, 'handleAddUsers');

  // Используем безопасные утилиты для работы с массивами
  const filteredProcesses = safeFilter(processes, p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = safeFilter(users, u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );
  const availableUsers = safeFilter(allUsers, u => 
    !safeFind(users, pu => pu.id === u.id)
  );

  const handleDeleteProcess = (process, event) => {
    event.stopPropagation(); // Предотвращаем открытие процесса при клике на кнопку удаления
    setProcessToDelete(process);
  };

  const confirmDeleteProcess = withErrorHandling(async () => {
    if (!processToDelete) return;

    await apiService.deleteProcess(processToDelete.id);
    setProcessToDelete(null);
    fetchData(); // Обновляем список процессов
  }, 'confirmDeleteProcess');  return (
    <Box>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={goHome}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <FolderIcon sx={{ mr: 1 }} />
          {editingProjectName ? (
            <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
              <TextField
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                size="small"
                variant="standard"
                autoFocus
                sx={{ mr: 1, minWidth: 180, color: 'white', input: { color: 'white' } }}
                InputProps={{
                  style: { color: 'white' },
                }}
              />
              <IconButton
                color="success"
                onClick={async () => {
                  await apiService.updateProject(projectId, { name: newProjectName });
                  setEditingProjectName(false);
                  fetchData();
                }}
                disabled={!newProjectName.trim()}
                sx={{ color: 'success.main' }}
              >
                <CheckIcon />
              </IconButton>
              <IconButton
                color="error"
                onClick={() => setEditingProjectName(false)}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          ) : (
            <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                {project.name}
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  setNewProjectName(project.name);
                  setEditingProjectName(true);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <Chip 
            label={user.name} 
            avatar={<Avatar>{user.name[0]}</Avatar>}
            sx={{ mr: 2, bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
          />

          <IconButton 
            color="inherit" 
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 1 }}
          >
            <AccountCircleIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        {/* Header Section */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Бизнес-процессы
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Управляйте и создавайте BPMN диаграммы для вашего проекта
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            size="large"
            disabled={loading}
          >
            Создать процесс
          </Button>
        </Box>

        {/* Search and Filters */}
        <Box display="flex" alignItems="center" mb={3}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Поиск процессов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 350 }}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
          <Box ml="auto">
            <Button 
              variant="outlined" 
              startIcon={<AccountTreeIcon />}
              sx={{ mr: 1 }}
              disabled={loading}
              onClick={onOpenProcessMap}
            >
              Карта процессов
            </Button>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} disabled={loading}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Loading Indicator */}
        {loading && <LoadingState message="Загрузка данных..." />}

        {/* Processes Grid */}
        {!loading && filteredProcesses.length > 0 && (
          <Grid container spacing={3}>
            {filteredProcesses.map((process) => (
              <Grid item xs={12} sm={6} md={4} key={process.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { 
                      transform: 'translateY(-2px)',
                      boxShadow: 4 
                    }
                  }}
                  onClick={() => onOpenProcess && onOpenProcess(process.id)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                      {process.editing ? (
                        <Box display="flex" alignItems="center">
                          <TextField
                            value={process.newName || process.name}
                            onChange={e => {
                              setProcesses(ps => ps.map(p => p.id === process.id ? { ...p, newName: e.target.value } : p));
                            }}
                            size="small"
                            variant="standard"
                            autoFocus
                            sx={{ mr: 1, minWidth: 120 }}
                          />
                          <IconButton
                            color="primary"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await apiService.updateProcess(process.id, { name: process.newName });
                              setProcesses(ps => ps.map(p => p.id === process.id ? { ...p, editing: false, name: process.newName } : p));
                            }}
                            disabled={!process.newName || !process.newName.trim()}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={e => {
                              e.stopPropagation();
                              setProcesses(ps => ps.map(p => p.id === process.id ? { ...p, editing: false, newName: undefined } : p));
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box display="flex" alignItems="center">
                          <Typography variant="h6" component="h3" noWrap sx={{ mr: 1 }}>
                            {process.name}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={e => {
                              e.stopPropagation();
                              setProcesses(ps => ps.map(p => p.id === process.id ? { ...p, editing: true, newName: p.name } : p));
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      BPMN диаграмма
                    </Typography>
                    
                    <Box mt={2}>
                      <Typography variant="caption" color="text.secondary">
                        Создал: {process.author || 'Неизвестно'}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        Изменен: {process.updated_at ? new Date(process.updated_at).toLocaleDateString() : 'Никогда'}
                      </Typography>
                    </Box>
                  </CardContent>
                  
                  <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                    <Button 
                      size="small" 
                      color="primary"
                      startIcon={<EditIcon />}
                      fullWidth
                    >
                      Открыть редактор
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => handleDeleteProcess(process, e)}
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty State */}
        {!loading && filteredProcesses.length === 0 && !error && (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center"
            sx={{ mt: 8 }}
          >
            <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {search ? 'Процессы не найдены' : 'Пока нет процессов'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              {search 
                ? 'Попробуйте изменить поисковый запрос'
                : 'Создайте свой первый BPMN процесс для моделирования бизнес-процессов'
              }
            </Typography>
            {!search && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Создать первый процесс
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Collaborators Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 350,
            p: 0
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Участники проекта</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <ArrowBackIcon />
            </IconButton>
          </Box>

          <Box display="flex" gap={1} mb={3}>
            <TextField
              size="small"
              placeholder="Поиск участников..."
              fullWidth
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <Tooltip title="Добавить участника">
              <IconButton 
                color="primary"
                onClick={() => setAddUserDialogOpen(true)}
              >
                <PersonAddIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <List>
            {filteredUsers.map((user, index) => (
              <React.Fragment key={user.id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>{user.name[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {user.email}
                        </Typography>
                        <Chip 
                          label={user.role} 
                          size="small" 
                          color={user.role === 'admin' ? 'error' : 'primary'}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
                {index < filteredUsers.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {filteredUsers.length === 0 && (
            <Box textAlign="center" py={4}>
              <AccountCircleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {userSearch ? 'Участники не найдены' : 'Пока нет участников'}
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Options Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <UploadIcon sx={{ mr: 1 }} />
          Импорт процесса
        </MenuItem>
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <DownloadIcon sx={{ mr: 1 }} />
          Экспорт всех
        </MenuItem>
      </Menu>

      {/* Create Process Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать новый процесс</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название процесса"
            fullWidth
            variant="outlined"
            value={newProcessName}
            onChange={(e) => setNewProcessName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleCreateProcess} 
            variant="contained"
            disabled={!newProcessName.trim()}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Users Dialog */}
      <Dialog open={addUserDialogOpen} onClose={() => setAddUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить пользователей в проект</DialogTitle>
        <DialogContent>
          <Autocomplete
            multiple
            options={availableUsers}
            getOptionLabel={(option) => `${option.name} (${option.email})`}
            value={selectedUsers}
            onChange={(event, newValue) => setSelectedUsers(newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option.name}
                  {...getTagProps({ index })}
                  key={option.id}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Выберите пользователей"
                placeholder="Выберите пользователей для добавления"
              />
            )}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddUserDialogOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleAddUsers} 
            variant="contained"
            disabled={selectedUsers.length === 0}
          >
            Добавить пользователей
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Process Confirmation Dialog */}
      <ConfirmDialog
        open={!!processToDelete}
        onClose={() => setProcessToDelete(null)}
        onConfirm={confirmDeleteProcess}
        title="Подтверждение удаления"
        message={`Вы уверены, что хотите удалить процесс "${processToDelete?.name}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        confirmColor="error"
      />
    </Box>
  );
}