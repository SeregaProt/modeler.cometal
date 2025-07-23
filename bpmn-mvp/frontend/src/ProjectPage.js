import React, { useEffect, useState } from 'react';
import {
  Box, Typography, IconButton, Button, Breadcrumbs, Link,
  TextField, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Stack, Chip, Divider
} from '@mui/material';
import AppsIcon from '@mui/icons-material/Apps';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

export default function ProjectPage({ projectId, goHome }) {
  const [processes, setProcesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [project, setProject] = useState({ name: '' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`http://localhost:4000/api/projects/${projectId}/processes`)
      .then(r => r.json())
      .then(setProcesses);

    fetch(`http://localhost:4000/api/projects/${projectId}/users`)
      .then(r => r.json())
      .then(setUsers);

    fetch(`http://localhost:4000/api/projects`)
      .then(r => r.json())
      .then(projects => {
        const proj = projects.find(p => p.id === projectId);
        setProject(proj || { name: 'Не найден' });
      });
  }, [projectId]);

  const filteredProcesses = processes.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Верхняя панель */}
      <Stack direction="row" alignItems="center" spacing={2}>
        <IconButton><AppsIcon /></IconButton>
        <Typography variant="subtitle1">BPMN 2.0</Typography>
        <Breadcrumbs>
          <Link underline="hover" color="inherit" onClick={goHome}>
            Проекты
          </Link>
          <Typography color="text.primary">{project.name}</Typography>
        </Breadcrumbs>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" spacing={2}>
        {/* Левая панель с пользователями */}
        <Box sx={{ width: '250px' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">Участники проекта</Typography>
            <IconButton size="small" color="primary">
              <AddIcon />
            </IconButton>
          </Stack>
          <Paper variant="outlined" sx={{ p: 1 }}>
            {users.map(user => (
              <Stack key={user.id} direction="row" alignItems="center" spacing={1} mb={1}>
                <Avatar>{user.name[0]}</Avatar>
                <Box>
                  <Typography variant="body2">{user.name}</Typography>
                  <Chip size="small" label={user.role} />
                </Box>
              </Stack>
            ))}
          </Paper>
        </Box>

        {/* Основная область */}
        <Box sx={{ flexGrow: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">{project.name}</Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<AccountTreeIcon />}>
                Просмотр связей
              </Button>
              <Button variant="contained" startIcon={<AddIcon />}>
                Создать процесс
              </Button>
            </Stack>
          </Stack>

          <TextField
            variant="outlined"
            placeholder="Поиск процесса..."
            size="small"
            fullWidth
            InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название процесса</TableCell>
                  <TableCell>Автор</TableCell>
                  <TableCell>Дата изменения</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProcesses.map(proc => (
                  <TableRow key={proc.id}>
                    <TableCell>{proc.name}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Stack>
    </Box>
  );
}
