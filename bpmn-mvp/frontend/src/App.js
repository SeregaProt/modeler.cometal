import React, { useState, useEffect } from "react";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import LoginPage from "./LoginPage";
import ProjectsPage from "./ProjectsPage";
import ProjectPage from "./ProjectPage";
import ProcessEditor from "./ProcessEditor";
import AdminPage from "./AdminPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("projects");
  const [projectId, setProjectId] = useState(null);
  const [processId, setProcessId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
            setView("process");
          }}
          goHome={() => setView("projects")}
          user={user}
        />
      )}
      {view === "process" && (
        <ProcessEditor
          processId={processId}
          goBack={() => setView("project")}
          user={user}
        />
      )}
    </ThemeProvider>
  );
}
