import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, Card, CardContent, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, AppBar, Toolbar, IconButton, Chip, Avatar
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetch("http://localhost:4000/api/users")
      .then(r => r.json())
      .then(setUsers);
    fetch("http://localhost:4000/api/projects")
      .then(r => r.json())
      .then(setProjects);
  };

  const handleAssignUser = () => {
    if (!projectId || !userId) return;

    fetch("http://localhost:4000/api/project-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, user_id: userId })
    }).then(() => {
      setProjectId("");
      setUserId("");
      fetchData();
    });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'editor': return 'primary';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

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
                      {users.map(u => (
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
                    {projects.map(p => (
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
                    {users.map(u => (
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
                    {users.length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Всего проектов:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {projects.length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Администраторов:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {users.filter(u => u.role === 'admin').length}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Add User Dialog */}
      <UserDialog 
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        onSuccess={() => {
          setUserDialogOpen(false);
          fetchData();
        }}
      />
    </Box>
  );
}

function UserDialog({ open, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("editor");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !name || !password) return;

    fetch("http://localhost:4000/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, role, password })
    })
    .then(response => {
      if (response.ok) {
        setEmail("");
        setName("");
        setPassword("");
        setRole("editor");
        onSuccess();
      }
    })
    .catch(console.error);
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
          />
          <TextField
            margin="dense"
            label="Имя"
            fullWidth
            variant="outlined"
            value={name}
            onChange={e => setName(e.target.value)}
            required
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
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Роль</InputLabel>
            <Select
              value={role}
              onChange={e => setRole(e.target.value)}
              label="Роль"
            >
              <MenuItem value="admin">Администратор</MenuItem>
              <MenuItem value="editor">Редактор</MenuItem>
              <MenuItem value="viewer">Наблюдатель</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Отмена</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={!email || !name || !password}
          >
            Добавить пользователя
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
