import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Checkbox,
  IconButton, Avatar, InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

export default function ProjectPage({ projectId, goHome, onOpenProcess }) {
  const [processes, setProcesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [project, setProject] = useState({ name: '' });

  useEffect(() => {
    fetch(`http://localhost:4000/api/projects/${projectId}/processes`)
      .then(r => r.json()).then(setProcesses);

    fetch(`http://localhost:4000/api/projects/${projectId}/users`)
      .then(r => r.json()).then(setUsers);

    fetch(`http://localhost:4000/api/projects`)
      .then(r => r.json())
      .then(projects => setProject(projects.find(p => p.id === projectId)));
  }, [projectId]);

  const filteredProcesses = processes.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box sx={{ p: 3 }}>
      {/* Верхняя строка */}
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>📁 {project.name}</Typography>
        {goHome && (
          <Button variant="outlined" size="small" onClick={goHome} sx={{ mr: 1 }}>
            Back
          </Button>
        )}
      </Box>

      {/* Поиск и кнопки */}
      <Box display="flex" alignItems="center" mb={2}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Filter table"
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          sx={{ width: 300 }}
          InputProps={{startAdornment:(
            <InputAdornment position="start"><SearchIcon/></InputAdornment>
          )}}
        />
        <Box ml="auto">
          <Button variant="text" startIcon={<AccountTreeIcon/>}>View landscape</Button>
          <Button variant="contained" startIcon={<AddIcon/>} sx={{ ml: 2 }}>Create new</Button>
        </Box>
      </Box>

      {/* Таблица процессов */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{bgcolor:'#f0f0f0'}}>
            <TableRow>
              <TableCell padding="checkbox"><Checkbox/></TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Creator</TableCell>
              <TableCell>Last changed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProcesses.map(proc => (
              <TableRow hover key={proc.id}
                onClick={() => onOpenProcess && onOpenProcess(proc.id)}
                sx={{ cursor: 'pointer' }}>
                <TableCell padding="checkbox"><Checkbox/></TableCell>
                <TableCell>
                  <Typography variant="body2" color="primary">{proc.name}</Typography>
                  <Typography variant="caption">BPMN diagram</Typography>
                </TableCell>
                <TableCell>{proc.author || '—'}</TableCell>
                <TableCell>{new Date(proc.updated_at).toLocaleString() || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Блок Collaborators справа */}
      <Box sx={{
        position:'fixed', top:80, right:0, width:280, height:'calc(100% - 80px)', 
        borderLeft:'1px solid #ddd', p:2, bgcolor:'#fff'
      }}>
        <Typography variant="subtitle1" gutterBottom>Collaborators</Typography>
        <Box display="flex" mb={1}>
          <TextField size="small" placeholder="Search" fullWidth
            InputProps={{startAdornment:<InputAdornment position="start"><SearchIcon/></InputAdornment>}}/>
          <Button variant="contained" size="small" sx={{ ml: 1 }}>Add user</Button>
        </Box>
        {users.map(u=>(
          <Box key={u.id} display="flex" alignItems="center" mb={1}>
            <Avatar sx={{ mr:1 }}>{u.name[0]}</Avatar>
            <Box>
              <Typography variant="body2">{u.name}</Typography>
              <Typography variant="caption">{u.role}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
