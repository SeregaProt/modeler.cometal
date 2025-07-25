import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, Card, CardContent, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, AppBar, Toolbar, IconButton, Chip, Avatar,
  Alert, CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

export default function AdminPage({ goHome, user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [userId, setUserId] = useState("");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch users
      const usersResponse = await fetch("http://localhost:4000/api/users");
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      } else {
        setUsers([]);
        throw new Error('Ошибка загрузки пользователей');
      }

      // Fetch projects
      const projectsResponse = await fetch("http://localhost:4000/api/projects");
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      } else {
        setProjects([]);
        throw new Error('Ошибка загрузки проектов');
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setUsers([]);
      setProjects([]);
      setError('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async () => {
    if (!projectId || !userId) return;

    try {
      const response = await fetch("http://localhost:4000/api/project-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, user_id: userId })
      });

      if (response.ok) {
        setProjectId("");
        setUserId("");
        fetchData();
      } else {
        const errorData = await response.json();
        setError('Ошибка назначения пользователя: ' + (errorData.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error assigning user:', error);
      setError('Ошибка назначения пользователя: ' + error.message);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'editor': return 'primary';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  // Убеждаемся, что массивы действительно являются массивами
  const safeUsers = Array.isArray(users) ? users : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  return (
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
          
          <AdminPanelSettingsIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Панель администратора
          </Typography>
          
          <Chip 
            label={user.name} 
            avatar={<Avatar>{user.name[0]}</Avatar>}
            sx={{ mr: 2, bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
          />
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
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
              Загрузка данных администратора...
            </Typography>
          </Box>
        )}

        {!loading && (
          <Grid container spacing={3}>
            {/* Users Management */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Управление пользователями</Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setUserDialogOpen(true)}
                    >
                      Добавить пользователя
                    </Button>
                  </Box>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Имя</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Роль</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {safeUsers.map(u => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                                  {u.name[0]}
                                </Avatar>
                                {u.name}
                              </Box>
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Chip 
                                label={u.role} 
                                color={getRoleColor(u.role)}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {safeUsers.length === 0 && (
                    <Box textAlign="center" py={4}>
                      <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Пользователи не найдены
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Project Assignment */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Назначить пользователя в проект
                  </Typography>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Выберите проект</InputLabel>
                    <Select
                      value={projectId}
                      onChange={e => setProjectId(e.target.value)}
                      label="Выберите проект"
                    >
                      {safeProjects.map(p => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Выберите пользователя</InputLabel>
                    <Select
                      value={userId}
                      onChange={e => setUserId(e.target.value)}
                      label="Выберите пользователя"
                    >
                      {safeUsers.map(u => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    fullWidth
                    variant="contained"
                    disabled={!projectId || !userId}
                    onClick={handleAssignUser}
                    sx={{ mt: 2 }}
                  >
                    Назначить пользователя
                  </Button>
                </CardContent>
              </Card>

              {/* Statistics */}
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Статистика
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Всего пользователей:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {safeUsers.length}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Всего проектов:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {safeProjects.length}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Администраторов:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {safeUsers.filter(u => u.role === 'admin').length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Add User Dialog */}
      <UserDialog 
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        onSuccess={() => {
          setUserDialogOpen(false);
          fetchData();
        }}
        onError={setError}
      />
    </Box>
  );
}

function UserDialog({ open, onClose, onSuccess, onError }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("editor");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !name || !password) return;

    setSubmitting(true);
    try {
      const response = await fetch("http://localhost:4000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role, password })
      });

      if (response.ok) {
        setEmail("");
        setName("");
        setPassword("");
        setRole("editor");
        onSuccess();
      } else {
        const errorData = await response.json();
        onError('Ошибка создания пользователя: ' + (errorData.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error creating user:', error);
      onError('Ошибка создания пользователя: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Добавить нового пользователя</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Электронная почта"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={submitting}
          />
          <TextField
            margin="dense"
            label="Имя"
            fullWidth
            variant="outlined"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            disabled={submitting}
          />
          <TextField
            margin="dense"
            label="Пароль"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={submitting}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Роль</InputLabel>
            <Select
              value={role}
              onChange={e => setRole(e.target.value)}
              label="Роль"
              disabled={submitting}
            >
              <MenuItem value="admin">Администратор</MenuItem>
              <MenuItem value="editor">Редактор</MenuItem>
              <MenuItem value="viewer">Наблюдатель</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>Отмена</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={!email || !name || !password || submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Добавить пользователя'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}