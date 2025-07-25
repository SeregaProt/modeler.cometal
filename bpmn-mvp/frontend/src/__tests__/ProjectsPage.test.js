import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectsPage from '../ProjectsPage';

// Mock fetch
global.fetch = jest.fn();

describe('ProjectsPage Component', () => {
  const mockUser = { id: 1, name: 'Test User', role: 'editor' };
  const mockOnProjectSelect = jest.fn();
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    fetch.mockClear();
    mockOnProjectSelect.mockClear();
    mockOnLogout.mockClear();
  });

  test('renders projects page correctly', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { id: 1, name: 'Test Project 1', description: 'Description 1' },
        { id: 2, name: 'Test Project 2', description: 'Description 2' }
      ])
    });

    render(<ProjectsPage user={mockUser} onProjectSelect={mockOnProjectSelect} onLogout={mockOnLogout} />);
    
    expect(screen.getByText(/BPMN Моделер - Проекты/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Test Project 2')).toBeInTheDocument();
    });
  });

  test('shows create project dialog when button clicked', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([])
    });

    const user = userEvent.setup();
    render(<ProjectsPage user={mockUser} onProjectSelect={mockOnProjectSelect} onLogout={mockOnLogout} />);
    
    const createButton = screen.getByText(/создать проект/i);
    await user.click(createButton);

    expect(screen.getByText(/новый проект/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/название проекта/i)).toBeInTheDocument();
  });

  test('creates new project successfully', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 3, name: 'New Project', description: 'New Description' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          { id: 3, name: 'New Project', description: 'New Description' }
        ])
      });

    const user = userEvent.setup();
    render(<ProjectsPage user={mockUser} onProjectSelect={mockOnProjectSelect} onLogout={mockOnLogout} />);
    
    // Open create dialog
    const createButton = screen.getByText(/создать проект/i);
    await user.click(createButton);

    // Fill form
    const nameInput = screen.getByLabelText(/название проекта/i);
    const descriptionInput = screen.getByLabelText(/описание/i);
    
    await user.type(nameInput, 'New Project');
    await user.type(descriptionInput, 'New Description');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /создать/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Project',
          description: 'New Description'
        })
      });
    });
  });

  test('handles project selection', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { id: 1, name: 'Test Project 1', description: 'Description 1' }
      ])
    });

    const user = userEvent.setup();
    render(<ProjectsPage user={mockUser} onProjectSelect={mockOnProjectSelect} onLogout={mockOnLogout} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    const projectCard = screen.getByText('Test Project 1').closest('.MuiCard-root');
    await user.click(projectCard);

    expect(mockOnProjectSelect).toHaveBeenCalledWith(1);
  });

  test('shows admin panel for admin users', async () => {
    const adminUser = { ...mockUser, role: 'admin' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([])
    });

    render(<ProjectsPage user={adminUser} onProjectSelect={mockOnProjectSelect} onLogout={mockOnLogout} />);
    
    expect(screen.getByText(/админ-панель/i)).toBeInTheDocument();
  });

  test('does not show admin panel for non-admin users', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([])
    });

    render(<ProjectsPage user={mockUser} onProjectSelect={mockOnProjectSelect} onLogout={mockOnLogout} />);
    
    expect(screen.queryByText(/админ-панель/i)).not.toBeInTheDocument();
  });

  test('handles logout', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([])
    });

    const user = userEvent.setup();
    render(<ProjectsPage user={mockUser} onProjectSelect={mockOnProjectSelect} onLogout={mockOnLogout} />);
    
    const logoutButton = screen.getByText(/выйти/i);
    await user.click(logoutButton);

    expect(mockOnLogout).toHaveBeenCalled();
  });
});