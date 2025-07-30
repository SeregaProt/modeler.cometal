import React, { useEffect, useRef, useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import {
  Box, AppBar, Toolbar, Typography, Button, IconButton,
  Snackbar, Alert, Menu, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CommentIcon from '@mui/icons-material/Comment';
import CommentWidget from './CommentWidget';
import ReactDOM from 'react-dom';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import './ProcessEditor.css';
import apiService from './services/api';
import { createErrorHandler, withErrorHandling } from './utils/errorHandler';
import { useDebounce } from './hooks/useDebounce';

function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export default function ProcessEditor({ processId, goBack, user }) {
  const canvasRef = useRef();
  const modeler = useRef();
  const overlaysRef = useRef({}); // {commentId: overlayId}

  // --- ВОССТАНОВЛЕНЫ функции управления масштабом ---
  const zoomIn = () => {
    if (!modeler.current) return;
    const canvas = modeler.current.get('canvas');
    canvas.zoom(canvas.zoom() + 0.1);
  };
  const zoomOut = () => {
    if (!modeler.current) return;
    const canvas = modeler.current.get('canvas');
    canvas.zoom(canvas.zoom() - 0.1);
  };
  const fitViewport = () => {
    if (!modeler.current) return;
    const canvas = modeler.current.get('canvas');
    canvas.zoom('fit-viewport');
  };
  const resetZoom = () => {
    if (!modeler.current) return;
    const canvas = modeler.current.get('canvas');
    canvas.zoom(1);
  };

  // --- ВОССТАНОВЛЕНА функция save ---
  const save = async () => {
    if (!modeler.current) return;
    try {
      const xml = await new Promise((resolve, reject) => {
        modeler.current.saveXML({ format: true }, (err, xml) => {
          if (err) reject(err);
          else resolve(xml);
        });
      });
      await apiService.updateProcess(processId, { bpmn: xml });
      setSnackbar({ open: true, message: 'Процесс успешно сохранен!', severity: 'success' });
      setHasChanges(false);
    } catch (error) {
      setSnackbar({ open: true, message: 'Ошибка сохранения процесса', severity: 'error' });
    }
  };

  // --- ВОССТАНОВЛЕНА функция exportBpmn ---
  const exportBpmn = () => {
    if (!modeler.current) return;
    modeler.current.saveXML({ format: true }, (err, xml) => {
      if (err) {
        setSnackbar({ open: true, message: 'Ошибка экспорта диаграммы', severity: 'error' });
        return;
      }
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${process.name || 'process'}.bpmn`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // --- ВОССТАНОВЛЕНА функция handleFileUpload ---
  const handleFileUpload = (event) => {
    if (!modeler.current) return;
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const xml = e.target.result;
        modeler.current.importXML(xml, (err) => {
          if (err) {
            setSnackbar({ open: true, message: 'Ошибка импорта BPMN файла', severity: 'error' });
          } else {
            setSnackbar({ open: true, message: 'BPMN файл успешно импортирован!', severity: 'success' });
          }
        });
      };
      reader.readAsText(file);
    }
    setMenuAnchor(null);
  };

  // --- ВОССТАНОВЛЕНА функция handleImport ---
  const handleImport = () => {
    if (!modeler.current) return;
    if (!importXml.trim()) return;
    modeler.current.importXML(importXml, (err) => {
      if (err) {
        setSnackbar({ open: true, message: 'Ошибка импорта BPMN файла', severity: 'error' });
      } else {
        setSnackbar({ open: true, message: 'BPMN файл успешно импортирован!', severity: 'success' });
        setImportDialogOpen(false);
        setImportXml('');
      }
    });
    setMenuAnchor(null);
  };
  const [process, setProcess] = useState({ name: '', author: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importXml, setImportXml] = useState('');
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);
  const [commentMode, setCommentMode] = useState(false);
  const [comments, setComments] = useState([]); // [{id, modelX, modelY, messages: []}]
  const [activeComment, setActiveComment] = useState(null); // {id, modelX, modelY, messages}
  const [viewbox, setViewbox] = useState(null);
  // Drag state
  const [draggingCommentId, setDraggingCommentId] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // --- ВОССТАНОВЛЕНИЕ инициализации BPMN-модельера и загрузки процесса ---
  useEffect(() => {
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

  // --- ВОССТАНОВЛЕНИЕ функции fetchProcess ---
  const fetchProcess = async () => {
    if (!modeler.current) return;
    try {
      const proc = await apiService.getProcess(processId);
      setProcess(proc);
      if (proc.bpmn) {
        await modeler.current.importXML(proc.bpmn);
      } else {
        await modeler.current.createDiagram();
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Ошибка загрузки процесса', severity: 'error' });
    }
  };

  // Горячая к��авиша "С" для режима комментария
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'c' || e.key === 'с') {
        setCommentMode((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Подписка на изменение viewbox
  useEffect(() => {
    if (!modeler.current) return;
    const canvas = modeler.current.get('canvas');
    const eventBus = modeler.current.get('eventBus');
    const updateViewbox = () => setViewbox(canvas.viewbox());
    updateViewbox();
    eventBus.on('canvas.viewbox.changed', updateViewbox);
    return () => eventBus.off('canvas.viewbox.changed', updateViewbox);
  }, [modeler.current]);

  // --- ОТМЕНА overlays: отображаем иконки комментариев через React ---
  // (оставляем useEffect пустым, overlays не использу��тся)
  useEffect(() => {}, []);

  // --- ВОССТАНОВЛЕНИЕ автосохранения ---
  const [debouncedAutoSave] = useDebounce(async () => {
    if (!modeler.current || !hasChanges || isAutoSaving) return;
    setIsAutoSaving(true);
    try {
      const xml = await new Promise((resolve, reject) => {
        modeler.current.saveXML({ format: true }, (err, xml) => {
          if (err) reject(err);
          else resolve(xml);
        });
      });
      await apiService.updateProcess(processId, { bpmn: xml });
      setLastAutoSave(new Date());
      setHasChanges(false);
    } catch (error) {
      // ignore
    } finally {
      setIsAutoSaving(false);
    }
  }, 2000);

  useEffect(() => {
    if (!modeler.current) return;
    const eventBus = modeler.current.get('eventBus');
    const handleChange = () => {
      setHasChanges(true);
      debouncedAutoSave();
    };
    const changeEvents = [
      'element.changed',
      'shape.added',
      'shape.removed',
      'connection.added',
      'connection.removed',
      'elements.paste'
    ];
    changeEvents.forEach(event => {
      eventBus.on(event, handleChange);
    });
    return () => {
      changeEvents.forEach(event => {
        eventBus.off(event, handleChange);
      });
    };
  }, [debouncedAutoSave]);

  // ... остальной код ProcessEditor (без блока рендера иконок комментариев)

  // --- остальной код ProcessEditor.js без изменений ---

  // ...

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
          {isAutoSaving && (
            <Chip icon={<CloudDoneIcon />} label="Автосохранение..." size="small" sx={{ mr: 2, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', '& .MuiChip-icon': { color: 'white' } }} />
          )}
          {lastAutoSave && !isAutoSaving && (
            <Chip icon={<CloudDoneIcon />} label={`Сохранено в ${formatTime(lastAutoSave)}`} size="small" sx={{ mr: 2, bgcolor: 'rgba(76, 175, 80, 0.2)', color: 'white', '& .MuiChip-icon': { color: '#4caf50' } }} />
          )}
          <Typography variant="body2" sx={{ mr: 2, opacity: 0.8 }}>
            Автор: {process.author || 'Неизвестно'}
          </Typography>
          <IconButton
            color={commentMode ? "primary" : "inherit"}
            onClick={() => setCommentMode((v) => !v)}
            title="Режим комментария (C)"
            sx={commentMode ? {
              mr: 1,
              bgcolor: 'primary.dark',
              color: 'white',
              boxShadow: 3,
              '&:hover': { bgcolor: '#102d5c', color: 'white' }
            } : {
              mr: 1
            }}
          >
            <CommentIcon sx={commentMode ? { color: 'white' } : {}} />
          </IconButton>
          <IconButton color="inherit" onClick={zoomOut} title="Уменьшить"><ZoomOutIcon /></IconButton>
          <IconButton color="inherit" onClick={resetZoom} title="100%"><Typography variant="caption" sx={{ minWidth: 30 }}>100%</Typography></IconButton>
          <IconButton color="inherit" onClick={zoomIn} title="Увеличить"><ZoomInIcon /></IconButton>
          <IconButton color="inherit" onClick={fitViewport} title="По размеру" sx={{ mr: 2 }}><FitScreenIcon /></IconButton>
          <Button color="inherit" startIcon={<SaveIcon />} onClick={save} sx={{ mr: 1 }}>Сохранить</Button>
          <IconButton color="inherit" onClick={(e) => setMenuAnchor(e.currentTarget)}><MoreVertIcon /></IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={exportBpmn}><DownloadIcon sx={{ mr: 1 }} />Экспорт BPMN</MenuItem>
            <MenuItem onClick={() => setImportDialogOpen(true)}><UploadIcon sx={{ mr: 1 }} />Импорт BPMN (текст)</MenuItem>
            <MenuItem component="label"><UploadIcon sx={{ mr: 1 }} />Импорт BPMN (файл)<input type="file" accept=".bpmn,.xml" hidden onChange={handleFileUpload} /></MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      {/* BPMN Canvas */}
      <Box ref={canvasRef} sx={{ flexGrow: 1, position: 'relative', cursor: commentMode ? 'crosshair' : 'default', '& .djs-palette': { left: '20px', top: '20px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }, '& .djs-context-pad': { border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }, '& .bjs-powered-by': { display: 'none !important' } }}
        onClick={e => {
          if (!commentMode || !viewbox) return;
          // Используем offsetX/offsetY для точного позиционирования
          const screenX = e.nativeEvent.offsetX;
          const screenY = e.nativeEvent.offsetY;
          const modelX = screenX / viewbox.scale + viewbox.x;
          const modelY = screenY / viewbox.scale + viewbox.y;
          const newComment = { id: Date.now(), modelX, modelY, messages: [] };
          setComments(prev => [...prev, newComment]);
          setActiveComment({ ...newComment });
          setCommentMode(false); // После постановки точки режим отключается
        }}
        onMouseMove={e => {
          if (!draggingCommentId || !viewbox) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const screenX = e.clientX - rect.left - dragOffset.current.x;
          const screenY = e.clientY - rect.top - dragOffset.current.y;
          const modelX = screenX / viewbox.scale + viewbox.x;
          const modelY = screenY / viewbox.scale + viewbox.y;
          setComments(prev => prev.map(c =>
            c.id === draggingCommentId ? { ...c, modelX, modelY } : c
          ));
        }}
        onMouseUp={e => {
          if (draggingCommentId) setDraggingCommentId(null);
        }}
      >
        {/* Иконки комментариев */}
        {comments.map(c => {
          if (!viewbox) return null;
          const screenX = (c.modelX - viewbox.x) * viewbox.scale;
          const screenY = (c.modelY - viewbox.y) * viewbox.scale;
          return (
            <Box
              key={c.id}
              sx={{
                position: 'absolute',
                left: screenX,
                top: screenY,
                zIndex: 5,
                cursor: 'pointer',
                bgcolor: 'white',
                borderRadius: '50%',
                border: '2px solid #1976d2',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
              }}
              onMouseDown={e => {
                e.stopPropagation();
                setDraggingCommentId(c.id);
                dragOffset.current = {
                  x: e.nativeEvent.offsetX - 14,
                  y: e.nativeEvent.offsetY - 14
                };
              }}
              onClick={e => {
                if (draggingCommentId) return; // не открывать окно при drag
                e.stopPropagation();
                setActiveComment(c);
              }}
              title="Открыть комментарии (перетащить мышью)"
            >
              <CommentIcon fontSize="small" color="primary" />
            </Box>
          );
        })}
        {/* Окно активного комментария */}
        {activeComment && viewbox && (() => {
          const screenX = (activeComment.modelX - viewbox.x) * viewbox.scale;
          const screenY = (activeComment.modelY - viewbox.y) * viewbox.scale;
          return (
            <CommentWidget
              comments={activeComment.messages}
              onSend={({ text, image }) => {
                setComments(prev => prev.map(c =>
                  c.id === activeComment.id
                    ? { ...c, messages: [ ...c.messages, { id: Date.now(), author: { name: user?.name || 'Пользователь', avatar: user?.avatar }, text, image, createdAt: new Date().toISOString() } ] }
                    : c
                ));
                setActiveComment(c => ({
                  ...c,
                  messages: [
                    ...c.messages,
                    { id: Date.now(), author: { name: user?.name || 'Пользователь', avatar: user?.avatar }, text, image, createdAt: new Date().toISOString() }
                  ]
                }));
              }}
              onClose={() => setActiveComment(null)}
              onDelete={() => {
                setComments(prev => prev.filter(c => c.id !== activeComment.id));
                setActiveComment(null);
              }}
              style={{
                position: 'absolute',
                left: screenX + 36,
                top: screenY - 8,
                minWidth: 320,
                zIndex: 1000
              }}
              currentUser={user}
            />
          );
        })()}
      </Box>
      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Импорт BPMN XML</DialogTitle>
        <DialogContent>
          <TextField multiline rows={10} fullWidth variant="outlined" label="Вставьте BPMN XML здесь" value={importXml} onChange={(e) => setImportXml(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleImport} variant="contained" disabled={!importXml.trim()}>Импортировать</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
