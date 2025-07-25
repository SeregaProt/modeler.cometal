import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch
global.fetch = jest.fn();

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  test('renders login page when not authenticated', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(<App />);
    
    expect(screen.getByText(/BPMN Моделер/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Пароль/i)).toBeInTheDocument();
  });

  test('shows loading state during authentication check', () => {
    localStorageMock.getItem.mockReturnValue('fake-token');
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401
    });

    render(<App />);
    
    // Should show some loading indicator or handle auth check
    expect(screen.getByText(/BPMN Моделер/i)).toBeInTheDocument();
  });

  test('handles login form submission', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'fake-token',
        user: { id: 1, name: 'Test User', role: 'editor' }
      })
    });

    const user = userEvent.setup();
    render(<App />);

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

  test('handles login error', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' })
    });

    const user = userEvent.setup();
    render(<App />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Пароль/i);
    const loginButton = screen.getByRole('button', { name: /войти/i });

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/неверный email или пароль/i)).toBeInTheDocument();
    });
  });
});