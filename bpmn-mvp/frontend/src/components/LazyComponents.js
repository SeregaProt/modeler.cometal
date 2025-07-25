import React, { lazy, Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

// Компонент загрузки
const LoadingFallback = ({ message = "Загрузка..." }) => (
  <Box 
    display="flex" 
    flexDirection="column"
    justifyContent="center" 
    alignItems="center" 
    height="100vh"
    gap={2}
  >
    <CircularProgress size={40} />
    <Typography variant="body1" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

// Lazy загрузка компонентов
const ProjectsPage = lazy(() => import('../ProjectsPage'));
const ProjectPage = lazy(() => import('../ProjectPage'));
const ProcessEditor = lazy(() => import('../ProcessEditor'));
const AdminPage = lazy(() => import('../AdminPage'));

// HOC для обертки lazy компонентов
const withLazyLoading = (Component, fallbackMessage) => {
  return React.forwardRef((props, ref) => (
    <Suspense fallback={<LoadingFallback message={fallbackMessage} />}>
      <Component {...props} ref={ref} />
    </Suspense>
  ));
};

// Экспорт обернутых компонентов
export const LazyProjectsPage = withLazyLoading(ProjectsPage, "Загрузка списка проектов...");
export const LazyProjectPage = withLazyLoading(ProjectPage, "Загрузка проекта...");
export const LazyProcessEditor = withLazyLoading(ProcessEditor, "Загрузка редактора процессов...");
export const LazyAdminPage = withLazyLoading(AdminPage, "Загрузка панели администратора...");

// Предзагрузка компонентов
export const preloadComponents = {
  projectsPage: () => import('../ProjectsPage'),
  projectPage: () => import('../ProjectPage'),
  processEditor: () => import('../ProcessEditor'),
  adminPage: () => import('../AdminPage')
};

// Утилита для предзагрузки компонентов
export const preloadComponent = (componentName) => {
  if (preloadComponents[componentName]) {
    preloadComponents[componentName]();
  }
};

// Предзагрузка критических компонентов при idle
export const preloadCriticalComponents = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadComponent('projectsPage');
      preloadComponent('projectPage');
    });
  } else {
    // Fallback для браузеров без поддержки requestIdleCallback
    setTimeout(() => {
      preloadComponent('projectsPage');
      preloadComponent('projectPage');
    }, 1000);
  }
};