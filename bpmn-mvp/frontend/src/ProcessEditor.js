import React, { useEffect, useRef, useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";

import {
  Box, AppBar, Toolbar, Typography, Button, IconButton,
  Snackbar, Alert, Menu, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';

// Импортируем CSS для bpmn-js
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import './ProcessEditor.css';

export default function ProcessEditor({ processId, goBack, user }) {
  const canvasRef = useRef();
  const modeler = useRef();
  const [process, setProcess] = useState({ name: '', author: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importXml, setImportXml] = useState('');

  useEffect(() => {
    // Создаем модельер с полным набором элементов
    modeler.current = new BpmnModeler({
      container: canvasRef.current,
      keyboard: { bindTo: document }
    });
    
    fetchProcess();

    return () => {
      if (modeler.current) {
        modeler.current.destroy();
      }
    };
  }, [processId]);

  // Функции для управления масштабом
  const zoomIn = () => {
    const canvas = modeler.current.get('canvas');
    canvas.zoom(canvas.zoom() + 0.1);
  };

  const zoomOut = () => {
    const canvas = modeler.current.get('canvas');
    canvas.zoom(canvas.zoom() - 0.1);
  };

  const fitViewport = () => {
    const canvas = modeler.current.get('canvas');
    canvas.zoom('fit-viewport');
  };

  const resetZoom = () => {
    const canvas = modeler.current.get('canvas');
    canvas.zoom(1);
  };

  const fetchProcess = () => {
    fetch(`http://localhost:4000/api/processes/${processId}`)
      .then(r => r.json())
      .then(proc => {
        setProcess(proc);
        if (proc.bpmn) {
          modeler.current.importXML(proc.bpmn);
        } else {
          modeler.current.createDiagram();
        }
      })
      .catch(err => {
        console.error('Error fetching process:', err);
        setSnackbar({ 
          open: true, 
          message: 'Ошибка загрузки процесса', 
          severity: 'error' 
        });
      });
  };

  const save = () => {
    modeler.current.saveXML({ format: true }, (err, xml) => {
      if (err) {
        setSnackbar({ 
          open: true, 
          message: 'Ошибка сохранения диаграммы', 
          severity: 'error' 
        });
        return;
      }

      fetch(`http://localhost:4000/api/processes/${processId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bpmn: xml })
      })
      .then(response => {
        if (response.ok) {
          setSnackbar({ 
            open: true, 
            message: 'Процесс успешно сохранен!', 
            severity: 'success' 
          });
        } else {
          throw new Error('Save failed');
        }
      })
      .catch(err => {
        setSnackbar({ 
          open: true, 
          message: 'Ошибка сохранения процесса', 
          severity: 'error' 
        });
      });
    });
  };

  const exportBpmn = () => {
    modeler.current.saveXML({ format: true }, (err, xml) => {
      if (err) {
        setSnackbar({ 
          open: true, 
          message: 'Ошибка экспорта диаграммы', 
          severity: 'error' 
        });
        return;
      }

      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${process.name || 'process'}.bpmn`;
      a.click();
      URL.revokeObjectURL(url);
      setMenuAnchor(null);
    });
  };

  const handleImport = () => {
    if (!importXml.trim()) return;

    modeler.current.importXML(importXml, (err) => {
      if (err) {
        setSnackbar({ 
          open: true, 
          message: 'Ошибка импорта BPMN файла', 
          severity: 'error' 
        });
      } else {
        setSnackbar({ 
          open: true, 
          message: 'BPMN файл успешно импортирован!', 
          severity: 'success' 
        });
        setImportDialogOpen(false);
        setImportXml('');
      }
    });
    setMenuAnchor(null);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const xml = e.target.result;
        modeler.current.importXML(xml, (err) => {
          if (err) {
            setSnackbar({ 
              open: true, 
              message: 'Ошибка импорта BPMN файла', 
              severity: 'error' 
            });
          } else {
            setSnackbar({ 
              open: true, 
              message: 'BPMN файл успешно импортирован!', 
              severity: 'success' 
            });
          }
        });
      };
      reader.readAsText(file);
    }
    setMenuAnchor(null);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={goBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {process.name || 'Редактор процессов'}
          </Typography>

          <Typography variant="body2" sx={{ mr: 2, opacity: 0.8 }}>
            Автор: {process.author || 'Неизвестно'}
          </Typography>

          {/* Zoom Controls */}
          <IconButton color="inherit" onClick={zoomOut} title="Уменьшить">
            <ZoomOutIcon />
          </IconButton>
          <IconButton color="inherit" onClick={resetZoom} title="100%">
            <Typography variant="caption" sx={{ minWidth: 30 }}>100%</Typography>
          </IconButton>
          <IconButton color="inherit" onClick={zoomIn} title="Увеличить">
            <ZoomInIcon />
          </IconButton>
          <IconButton color="inherit" onClick={fitViewport} title="По размеру" sx={{ mr: 2 }}>
            <FitScreenIcon />
          </IconButton>

          
          <Button
            color="inherit"
            startIcon={<SaveIcon />}
            onClick={save}
            sx={{ mr: 1 }}
          >
            Сохранить
          </Button>

          <IconButton 
            color="inherit" 
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            <MoreVertIcon />
          </IconButton>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={exportBpmn}>
              <DownloadIcon sx={{ mr: 1 }} />
              Экспорт BPMN
            </MenuItem>
            <MenuItem onClick={() => setImportDialogOpen(true)}>
              <UploadIcon sx={{ mr: 1 }} />
              Импорт BPMN (текст)
            </MenuItem>
            <MenuItem component="label">
              <UploadIcon sx={{ mr: 1 }} />
              Импорт BPMN (файл)
              <input
                type="file"
                accept=".bpmn,.xml"
                hidden
                onChange={handleFileUpload}
              />
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* BPMN Canvas */}
      <Box 
        ref={canvasRef} 
        sx={{ 
          flexGrow: 1,
          position: 'relative',
          '& .djs-palette': {
            left: '20px',
            top: '20px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          },
          '& .djs-context-pad': {
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }
        }} 
      />

      {/* Import Dialog */}
      <Dialog 
        open={importDialogOpen} 
        onClose={() => setImportDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Импорт BPMN XML</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            label="Вставьте BPMN XML здесь"
            value={importXml}
            onChange={(e) => setImportXml(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleImport} 
            variant="contained"
            disabled={!importXml.trim()}
          >
            Импортировать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
