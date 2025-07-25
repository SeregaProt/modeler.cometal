import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../LoginPage';

// Mock fetch
global.fetch = jest.fn();

describe('LoginPage Component', () => {
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    fetch.mockClear();
    mockOnLogin.mockClear();
  });

  test('renders login form correctly', () => {
    render(<LoginPage onLogin={mockOnLogin} />);
    
    expect(screen.getByText(/BPMN Моделер/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Пароль/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
    expect(screen.getByText(/нет аккаунта/i)).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    const user = userEvent.setup();
    render(<LoginPage onLogin={mockOnLogin} />);

    const loginButton = screen.getByRole('button', { name: /войти/i });
    await user.click(loginButton);

    // Should show validation errors or prevent submission
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  test('validates email format', async () => {
    const user = userEvent.setup();
    render(<LoginPage onLogin={mockOnLogin} />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Пароль/i);
    const loginButton = screen.getByRole('button', { name: /войти/i });

    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);

    // Should validate email format
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  test('submits form with valid data', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'fake-token',
        user: { id: 1, name: 'Test User', role: 'editor' }
      })
    });

    const user = userEvent.setup();
    render(<LoginPage onLogin={mockOnLogin} />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Пароль/i);
    const loginButton = screen.getByRole('button', { name: /войти/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });
    });
  });

  test('switches to registration mode', async () => {
    const user = userEvent.setup();
    render(<LoginPage onLogin={mockOnLogin} />);

    const registerLink = screen.getByText(/зарегистрироваться/i);
    await user.click(registerLink);

    expect(screen.getByText(/регистрация/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/имя/i)).toBeInTheDocument();
  });

  test('handles registration form submission', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'fake-token',
        user: { id: 1, name: 'New User', role: 'editor' }
      })
    });

    const user = userEvent.setup();
    render(<LoginPage onLogin={mockOnLogin} />);

    // Switch to registration
    const registerLink = screen.getByText(/зарегистрироваться/i);
    await user.click(registerLink);

    const nameInput = screen.getByLabelText(/имя/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Пароль/i);
    const registerButton = screen.getByRole('button', { name: /зарегистрироваться/i });

    await user.type(nameInput, 'New User');
    await user.type(emailInput, 'newuser@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(registerButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123'
        })
      });
    });
  });
});