import React, { useState, useRef, useEffect } from 'react';
import { Box, Avatar, Typography, TextField, IconButton, Button, Paper, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';

// Пример структуры одного комментария
// {
//   id, author: {name, avatar}, text, createdAt
// }

export default function CommentWidget({
  comments = [],
  onSend,
  onClose,
  onDelete,
  style = {},
  currentUser
}) {
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const widgetRef = useRef();
  const inputRef = useRef();

  // Закрытие по клику вне окна
  useEffect(() => {
    // Фокусируем поле ввода для мгновенного ввода текста
    if (inputRef.current) inputRef.current.focus();
    const handleClick = (e) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) {
        onClose && onClose();
      }
    };
    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [onClose]);

  const handleSend = () => {
    if (input.trim() || image) {
      onSend({ text: input, image });
      setInput('');
      setImage(null);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <Paper
      elevation={4}
      ref={widgetRef}
      sx={{ position: 'absolute', minWidth: 320, maxWidth: 400, p: 2, ...style, zIndex: 10 }}
      tabIndex={-1}
      onKeyDown={e => {
        if ((e.key === 'Delete' || e.keyCode === 46) && onDelete) {
          e.preventDefault();
          onDelete();
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1">Комментарии</Typography>
        <Box>
          {onDelete && (
            <Button size="small" color="error" onClick={onDelete} sx={{ minWidth: 0, mr: 1 }}>🗑</Button>
          )}
          <IconButton onClick={onClose} size="large" sx={{ ml: 0.5 }}>
            <CloseIcon fontSize="large" />
          </IconButton>
        </Box>
      </Box>
      <Box sx={{ maxHeight: 220, overflowY: 'auto', mb: 1 }}>
        {comments.length === 0 && (
          <Typography variant="body2" color="text.secondary">Нет комментариев</Typography>
        )}
        {comments.map((c) => (
          <Box key={c.id} sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
            <Avatar src={c.author.avatar} sx={{ width: 28, height: 28, mr: 1 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.author.name}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{c.text}</Typography>
              {c.image && <img src={c.image} alt="img" style={{ maxWidth: 120, marginTop: 4, borderRadius: 4 }} />}
              <Typography variant="caption" color="text.secondary">{new Date(c.createdAt).toLocaleString()}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
      {image && (
        <Box sx={{ mb: 1 }}>
          <img src={image} alt="preview" style={{ maxWidth: 120, borderRadius: 4 }} />
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Avatar src={currentUser?.avatar} sx={{ width: 28, height: 28, mr: 1 }} />
        <TextField
          size="small"
          placeholder="Написать комментарий..."
          value={input}
          onChange={e => setInput(e.target.value)}
          sx={{ flexGrow: 1, mr: 1 }}
          multiline
          maxRows={3}
          inputRef={inputRef}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.keyCode === 13) && (e.metaKey || e.ctrlKey)) {
              if (!input.trim() && onDelete) {
                e.preventDefault();
                onDelete();
              } else {
                e.preventDefault();
                handleSend();
              }
            }
          }}
        />
        <Tooltip title="Смайлик"><IconButton size="small"><InsertEmoticonIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Картинка">
          <IconButton size="small" component="label">
            <ImageIcon fontSize="small" />
            <input type="file" accept="image/*" hidden onChange={handleImageChange} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Отправить">
          <span>
            <IconButton size="small" color="primary" onClick={handleSend} disabled={!input.trim() && !image}>
              <SendIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Paper>
  );
}
