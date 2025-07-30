import React, { useState, useEffect } from "react";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import LoginPage from "./LoginPage";
import ProjectsPage from "./ProjectsPage";
import ProjectPage from "./ProjectPage";
import ProcessEditor from "./ProcessEditor";
import AdminPage from "./AdminPage";
import ProcessMapPage from "./ProcessMapPage";
import { isTokenValid, clearInvalidToken } from './utils/auth';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("projects");
  const [projectId, setProjectId] = useState(null);
  const [processId, setProcessId] = useState(null);
  const [highlightedProcessId, setHighlightedProcessId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        // Пров��ряем валидность токена
        if (isTokenValid(token)) {
          setUser(JSON.parse(savedUser));
        } else {
          // Токен недействителен, очищаем
          console.log('Invalid token detected, clearing...');
          clearInvalidToken();
        }
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        clearInvalidToken();
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setView("projects");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {view === "admin" && (
        <AdminPage 
          goHome={() => setView("projects")} 
          user={user}
          onLogout={handleLogout}
        />
      )}
      {view === "projects" && (
        <ProjectsPage
          onSelectProject={(id) => {
            setProjectId(id);
            setView("project");
          }}
          onAdmin={() => setView("admin")}
          user={user}
          onLogout={handleLogout}
        />
      )}
      {view === "project" && (
        <ProjectPage
          projectId={projectId}
          onOpenProcess={(pid) => {
            setProcessId(pid);
            setHighlightedProcessId(null);
            setView("process");
          }}
          onOpenProcessMap={() => {
            setHighlightedProcessId(null);
            setView("processMap");
          }}
          goHome={() => setView("projects")}
          user={user}
        />
      )}
      {view === "processMap" && (
        <ProcessMapPage
          projectId={projectId}
          highlightedProcessId={highlightedProcessId}
          onBack={() => {
            setHighlightedProcessId(null);
            setView("project");
          }}
          onOpenProcess={(pid) => {
            setProcessId(pid);
            setHighlightedProcessId(null);
            setView("process");
          }}
        />
      )}
      {view === "process" && (
        <ProcessEditor
          processId={processId}
          goBack={() => setView("project")}
          user={user}
          onOpenProcessMap={(pid) => {
            setHighlightedProcessId(pid);
            setView("processMap");
          }}
        />
      )}
    </ThemeProvider>
  );
}