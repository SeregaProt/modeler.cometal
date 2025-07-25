# ⚡ Улучшения производительности

## 1. Добавление пагинации

### Backend пагинация
```javascript
// backend/middleware/pagination.js
const paginate = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // Валидация
  if (page < 1 || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'Invalid pagination parameters' });
  }

  req.pagination = { page, limit, offset };
  next();
};

module.exports = { paginate };
```

### Пагинированные запросы
```javascript
// backend/routes/projects.js
app.get('/api/projects', authenticateToken, paginate, (req, res) => {
  const { limit, offset } = req.pagination;
  
  // Запрос с подсчетом общего количества
  const countQuery = req.user.role === 'admin' 
    ? 'SELECT COUNT(*) as total FROM projects'
    : 'SELECT COUNT(DISTINCT p.id) as total FROM projects p LEFT JOIN project_users pu ON p.id = pu.project_id WHERE pu.user_id = ? OR p.created_by = ?';
  
  const dataQuery = req.user.role === 'admin'
    ? 'SELECT p.*, u.name as creator_name FROM projects p LEFT JOIN users u ON p.created_by = u.id ORDER BY p.updated_at DESC LIMIT ? OFFSET ?'
    : 'SELECT p.*, u.name as creator_name FROM projects p LEFT JOIN users u ON p.created_by = u.id LEFT JOIN project_users pu ON p.id = pu.project_id WHERE pu.user_id = ? OR p.created_by = ? ORDER BY p.updated_at DESC LIMIT ? OFFSET ?';

  const countParams = req.user.role === 'admin' ? [] : [req.user.id, req.user.id];
  const dataParams = req.user.role === 'admin' ? [limit, offset] : [req.user.id, req.user.id, limit, offset];

  // Выполняем оба запроса параллельно
  Promise.all([
    new Promise((resolve, reject) => {
      db.get(countQuery, countParams, (err, result) => {
        if (err) reject(err);
        else resolve(result.total);
      });
    }),
    new Promise((resolve, reject) => {
      db.all(dataQuery, dataParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  ])
  .then(([total, data]) => {
    const totalPages = Math.ceil(total / limit);
    res.json({
      data,
      pagination: {
        page: req.pagination.page,
        limit,
        total,
        totalPages,
        hasNext: req.pagination.page < totalPages,
        hasPrev: req.pagination.page > 1
      }
    });
  })
  .catch(err => {
    logger.error('Error fetching paginated projects:', err);
    res.status(500).json({ error: 'Database error' });
  });
});
```

### Frontend пагинация
```javascript
// frontend/src/components/PaginatedTable.js
import React from 'react';
import { 
  TablePagination, 
  Box, 
  CircularProgress 
} from '@mui/material';

const PaginatedTable = ({ 
  data, 
  pagination, 
  onPageChange, 
  onRowsPerPageChange,
  loading,
  children 
}) => {
  const handleChangePage = (event, newPage) => {
    onPageChange(newPage + 1); // MUI uses 0-based, our API uses 1-based
  };

  const handleChangeRowsPerPage = (event) => {
    onRowsPerPageChange(parseInt(event.target.value, 10));
  };

  return (
    <Box>
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {children}
          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page - 1} // Convert to 0-based for MUI
            onPageChange={handleChangePage}
            rowsPerPage={pagination.limit}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Строк на странице:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} из ${count !== -1 ? count : `более чем ${to}`}`
            }
          />
        </>
      )}
    </Box>
  );
};

export default PaginatedTable;
```

## 2. Оптимизация bundle размера

### Lazy loading компонентов
```javascript
// frontend/src/App.js
import React, { Suspense, lazy } from 'react';
import { CircularProgress, Box } from '@mui/material';

// Lazy loading компонентов
const ProjectsPage = lazy(() => import('./ProjectsPage'));
const ProjectPage = lazy(() => import('./ProjectPage'));
const ProcessEditor = lazy(() => import('./ProcessEditor'));
const AdminPage = lazy(() => import('./AdminPage'));

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
    <CircularProgress />
  </Box>
);

export default function App() {
  // ... остальной код

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
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
          {/* ... остальные компоненты */}
        </Suspense>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
```

### Tree shaking для Material-UI
```javascript
// frontend/src/components/MaterialUI.js
// Вместо импорта всей библиотеки, импортируем только нужные компоненты
export { 
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Tooltip
} from '@mui/material';

export {
  Search as SearchIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
  AccountTree as AccountTreeIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Folder as FolderIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitScreenIcon,
  CloudDone as CloudDoneIcon,
  PersonAdd as PersonAddIcon,
  AccountCircle as AccountCircleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
```

## 3. Кэширование

### React Query для кэширования API
```bash
cd frontend
npm install @tanstack/react-query
```

```javascript
// frontend/src/hooks/useApi.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

// Проекты
export const useProjects = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['projects', page, limit],
    queryFn: () => apiService.getProjects({ page, limit }),
    staleTime: 5 * 60 * 1000, // 5 минут
    cacheTime: 10 * 60 * 1000, // 10 минут
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.createProject,
    onSuccess: () => {
      // Инвалидируем кэш проектов
      queryClient.invalidateQueries(['projects']);
    },
  });
};

// Процессы
export const useProcesses = (projectId) => {
  return useQuery({
    queryKey: ['processes', projectId],
    queryFn: () => apiService.getProcesses(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 минуты
  });
};

export const useProcess = (processId) => {
  return useQuery({
    queryKey: ['process', processId],
    queryFn: () => apiService.getProcess(processId),
    enabled: !!processId,
    staleTime: 1 * 60 * 1000, // 1 минута
  });
};

export const useUpdateProcess = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, data }) => apiService.updateProcess(processId, data),
    onSuccess: (data, variables) => {
      // Обновляем кэш конкретного процесса
      queryClient.setQueryData(['process', variables.processId], data);
      // Инвалидируем список процессов
      queryClient.invalidateQueries(['processes']);
    },
  });
};

// Пользователи
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: apiService.getUsers,
    staleTime: 10 * 60 * 1000, // 10 минут
  });
};
```

### Настройка React Query
```javascript
// frontend/src/App.js
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 минут по умолчанию
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Остальной код */}
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

## 4. Оптимизация ProcessEditor

### Debounced автосохранение
```javascript
// frontend/src/hooks/useDebounce.js
import { useCallback, useRef } from 'react';

export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return [debouncedCallback, cancel];
};
```

```javascript
// frontend/src/ProcessEditor.js
import { useDebounce } from './hooks/useDebounce';
import { useUpdateProcess } from './hooks/useApi';

export default function ProcessEditor({ processId, goBack, user }) {
  const updateProcessMutation = useUpdateProcess();
  const [hasChanges, setHasChanges] = useState(false);

  // Debounced автосохранение
  const [debouncedSave] = useDebounce(async () => {
    if (!modeler.current || !hasChanges) return;

    try {
      const xml = await new Promise((resolve, reject) => {
        modeler.current.saveXML({ format: true }, (err, xml) => {
          if (err) reject(err);
          else resolve(xml);
        });
      });

      await updateProcessMutation.mutateAsync({
        processId,
        data: { bpmn: xml }
      });

      setHasChanges(false);
      setLastAutoSave(new Date());
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }, 2000); // 2 секунды задержки

  useEffect(() => {
    if (!modeler.current) return;

    // Слушаем изменения в модели
    const eventBus = modeler.current.get('eventBus');
    
    const handleChange = () => {
      setHasChanges(true);
      debouncedSave();
    };

    // События, которые указывают на изменения
    const changeEvents = [
      'element.changed',
      'shape.added',
      'shape.removed',
      'connection.added',
      'connection.removed'
    ];

    changeEvents.forEach(event => {
      eventBus.on(event, handleChange);
    });

    return () => {
      changeEvents.forEach(event => {
        eventBus.off(event, handleChange);
      });
    };
  }, [debouncedSave]);

  // Остальной код...
}
```

## 5. Виртуализация для больших списков

### Виртуализированный список процессов
```bash
cd frontend
npm install react-window react-window-infinite-loader
```

```javascript
// frontend/src/components/VirtualizedProcessList.js
import React from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { Card, CardContent, Typography, Box } from '@mui/material';

const ProcessItem = ({ index, style, data }) => {
  const { processes, onOpenProcess } = data;
  const process = processes[index];

  if (!process) {
    return (
      <div style={style}>
        <Card sx={{ m: 1, height: 120 }}>
          <CardContent>
            <Typography>Загрузка...</Typography>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div style={style}>
      <Card 
        sx={{ 
          m: 1, 
          height: 120, 
          cursor: 'pointer',
          '&:hover': { boxShadow: 4 }
        }}
        onClick={() => onOpenProcess(process.id)}
      >
        <CardContent>
          <Typography variant="h6" noWrap>
            {process.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Автор: {process.author}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Изменен: {new Date(process.updated_at).toLocaleDateString()}
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
};

const VirtualizedProcessList = ({ 
  processes, 
  hasNextPage, 
  isNextPageLoading, 
  loadNextPage,
  onOpenProcess 
}) => {
  const itemCount = hasNextPage ? processes.length + 1 : processes.length;
  const isItemLoaded = index => !!processes[index];

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={itemCount}
        loadMoreItems={loadNextPage}
      >
        {({ onItemsRendered, ref }) => (
          <List
            ref={ref}
            height={600}
            itemCount={itemCount}
            itemSize={140}
            itemData={{ processes, onOpenProcess }}
            onItemsRendered={onItemsRendered}
          >
            {ProcessItem}
          </List>
        )}
      </InfiniteLoader>
    </Box>
  );
};

export default VirtualizedProcessList;
```