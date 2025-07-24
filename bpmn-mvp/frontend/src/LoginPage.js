import React, { useState } from 'react';
import {
  Box, Paper, TextField, Button, Typography, Alert, Tab, Tabs
} from '@mui/material';

export default function LoginPage({ onLogin }) {
  const [tab, setTab] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = tab === 0 ? '/api/auth/login' : '/api/auth/register';
      const payload = tab === 0 
        ? { email: formData.email, password: formData.password }
        : { 
            email: formData.email, 
            password: formData.password, 
            name: formData.name 
          };

      if (tab === 1 && formData.password !== formData.confirmPassword) {
        setError('Пароли не совпадают');
        setLoading(false);
        return;
      }

      const response = await fetch(`http://localhost:4000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка аутентификации');
      }

      if (tab === 0) {
        // Login successful
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        // Registration successful, switch to login
        setTab(0);
        setFormData({ ...formData, password: '', confirmPassword: '' });
        setError('Регистрация прошла успешно! Пожалуйста, войдите в систему.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="100vh"
      bgcolor="#f5f5f5"
    >
      <Paper elevation={3} sx={{ p: 4, width: 400 }}>
        <Typography variant="h4" align="center" gutterBottom>
          BPMN Моделер
        </Typography>
        
        <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} centered>
          <Tab label="Вход" />
          <Tab label="Регистрация" />
        </Tabs>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          {error && (
            <Alert severity={error.includes('successful') ? 'success' : 'error'} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Электронная почта"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            margin="normal"
            required
          />

          {tab === 1 && (
            <TextField
              fullWidth
              label="Имя"
              value={formData.name}
              onChange={handleChange('name')}
              margin="normal"
              required
            />
          )}

          <TextField
            fullWidth
            label="Пароль"
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            margin="normal"
            required
          />

          {tab === 1 && (
            <TextField
              fullWidth
              label="Подтвердите пароль"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              margin="normal"
              required
            />
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Загрузка...' : (tab === 0 ? 'Войти' : 'Зарегистрироваться')}
          </Button>
        </Box>

        {tab === 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f0f0f0', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Демо-аккаунт:
            </Typography>
            <Typography variant="body2">
              Email: admin@example.com
            </Typography>
            <Typography variant="body2">
              Пароль: admin123
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}