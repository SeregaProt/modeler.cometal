import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Checkbox,
  Avatar, InputAdornment, IconButton, Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

export default function ProjectPage({ projectId, goHome }) {
  const [processes, setProcesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [project, setProject] = useState({ name: '' });

  useEffect(() => {
    fetch(`http://localhost:4000/api/projects/${projectId}/processes`).then(r=>r.json()).then(setProcesses);
    fetch(`http://localhost:4000/api/projects/${projectId}/users`).then(r=>r.json()).then(setUsers);
    fetch(`http://localhost:4000/api/projects`).then(r=>r.json())
      .then(projects=>setProject(projects.find(p=>p.id===projectId)));
  }, [projectId]);

  const filteredProcesses = processes.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box sx={{ padding: 3, fontFamily: 'Roboto, sans-serif' }}>
      
      {/* Header */}
      <Typography variant="h6" sx={{display:'flex', alignItems:'center', mb:2}}>
        📁&nbsp;{project.name}
      </Typography>

      {/* Search & Actions */}
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <TextField
          placeholder="Filter table"
          size="small"
          InputProps={{startAdornment:<SearchIcon color="action"/>}}
          sx={{width:250}}
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
        />
        <Box sx={{flexGrow:1}} />
        <Button startIcon={<AccountTreeIcon/>}>View landscape</Button>
        <Button variant="contained" startIcon={<AddIcon/>}>Create new</Button>
      </Stack>

      {/* Table */}
      <Paper elevation={1}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{bgcolor:'#f7f7f7'}}>
              <TableRow>
                <TableCell padding="checkbox"><Checkbox/></TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Creator</TableCell>
                <TableCell>Last changed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProcesses.map(proc=>(
                <TableRow key={proc.id} hover>
                  <TableCell padding="checkbox"><Checkbox/></TableCell>
                  <TableCell>
                    <Typography color="#1976d2" sx={{cursor:'pointer'}}>{proc.name}</Typography>
                    <Typography variant="caption" color="text.secondary">BPMN diagram</Typography>
                  </TableCell>
                  <TableCell>{proc.author||'—'}</TableCell>
                  <TableCell>{proc.updated_at ? new Date(proc.updated_at).toLocaleString() : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Collaborators panel */}
      <Box sx={{
        position:'fixed', top:60, right:0, width:320, height:'calc(100% - 60px)', bgcolor:'#fff',
        borderLeft:'1px solid #ddd', p:2, boxShadow:3
      }}>
        <Typography variant="subtitle1" sx={{mb:2}}>Collaborators</Typography>
        <Stack direction="row" spacing={1} mb={2}>
          <TextField placeholder="Search" size="small"
            InputProps={{startAdornment:<SearchIcon color="action"/>}}/>
          <Button variant="contained" sx={{minWidth:100}}>Add User</Button>
        </Stack>
        <Box>
          {users.map(u=>(
            <Box key={u.id} sx={{display:'flex', alignItems:'center', mb:1}}>
              <Avatar sx={{mr:1}}>{u.name[0]}</Avatar>
              <Box>
                <Typography variant="body2">{u.name}</Typography>
                <Typography variant="caption" color="text.secondary">{u.role}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Back button */}
      <IconButton variant="outlined" onClick={goHome} sx={{position:'fixed', top:10, right:10}}>
        <Typography variant="button">BACK</Typography>
      </IconButton>

    </Box>
  );
}
