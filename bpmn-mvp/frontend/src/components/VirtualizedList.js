import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Skeleton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { DescriptionIcon, EditIcon } from './MaterialUI';

/**
 * Виртуализированный список процессов для оптимальной производительности
 */
const VirtualizedProcessList = ({ 
  processes = [], 
  hasNextPage = false, 
  isNextPageLoading = false, 
  loadNextPage = () => {},
  onOpenProcess = () => {},
  itemHeight = 140,
  containerHeight = 600
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Адаптивная высота элементов
  const adaptiveItemHeight = isMobile ? 120 : itemHeight;
  
  // Общее количество элементов (включая загружаемые)
  const itemCount = hasNextPage ? processes.length + 1 : processes.length;
  
  // Проверка загрузки элемента
  const isItemLoaded = (index) => !!processes[index];

  // Компонент элемента списка
  const ProcessItem = ({ index, style }) => {
    const process = processes[index];

    // Показываем скелетон для загружаемых элементов
    if (!process) {
      return (
        <div style={style}>
          <Card sx={{ m: 1, height: adaptiveItemHeight - 8 }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={16} sx={{ mt: 1 }} />
              <Skeleton variant="text" width="80%" height={16} sx={{ mt: 1 }} />
              <Skeleton variant="rectangular" width="100%" height={32} sx={{ mt: 2 }} />
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
            height: adaptiveItemHeight - 8,
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': { 
              transform: 'translateY(-2px)',
              boxShadow: theme.shadows[4]
            }
          }}
          onClick={() => onOpenProcess(process.id)}
        >
          <CardContent sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            p: isMobile ? 1.5 : 2,
            '&:last-child': { pb: isMobile ? 1.5 : 2 }
          }}>
            {/* Заголовок */}
            <Box display="flex" alignItems="center" mb={1}>
              <DescriptionIcon 
                color="primary" 
                sx={{ mr: 1, fontSize: isMobile ? 20 : 24 }} 
              />
              <Typography 
                variant={isMobile ? "subtitle1" : "h6"} 
                component="h3" 
                noWrap
                sx={{ flexGrow: 1 }}
              >
                {process.name}
              </Typography>
            </Box>
            
            {/* Описание */}
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ mb: 'auto' }}
            >
              BPMN диаграмма
              {process.has_diagram && (
                <Box 
                  component="span" 
                  sx={{ 
                    ml: 1, 
                    px: 1, 
                    py: 0.25, 
                    bgcolor: 'success.light', 
                    color: 'success.contrastText',
                    borderRadius: 1,
                    fontSize: '0.75rem'
                  }}
                >
                  Готова
                </Box>
              )}
            </Typography>
            
            {/* Метаданные */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Автор: {process.author || 'Неизвестно'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Изменен: {process.updated_at 
                  ? new Date(process.updated_at).toLocaleDateString('ru-RU')
                  : 'Никогда'
                }
              </Typography>
            </Box>
            
            {/* Кнопка действия */}
            <Box 
              sx={{ 
                mt: 1, 
                pt: 1, 
                borderTop: 1, 
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 32
              }}
            >
              <Box display="flex" alignItems="center" color="primary.main">
                <EditIcon sx={{ mr: 0.5, fontSize: 16 }} />
                <Typography variant="caption" fontWeight="medium">
                  Открыть редактор
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Мемоизируем компонент для оптимизации
  const MemoizedProcessItem = useMemo(() => ProcessItem, [processes, isMobile, theme]);

  return (
    <Box sx={{ height: containerHeight, width: '100%' }}>
      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={itemCount}
        loadMoreItems={loadNextPage}
        threshold={5} // Загружаем следующую страницу за 5 элементов до конца
      >
        {({ onItemsRendered, ref }) => (
          <List
            ref={ref}
            height={containerHeight}
            itemCount={itemCount}
            itemSize={adaptiveItemHeight}
            onItemsRendered={onItemsRendered}
            overscanCount={5} // Рендерим 5 дополнительных элементов для плавности
            itemData={{ processes, onOpenProcess }}
          >
            {MemoizedProcessItem}
          </List>
        )}
      </InfiniteLoader>
    </Box>
  );
};

/**
 * Виртуализированная табл��ца для больших списков данных
 */
export const VirtualizedTable = ({
  data = [],
  columns = [],
  rowHeight = 60,
  headerHeight = 48,
  containerHeight = 400,
  onRowClick = () => {},
  loading = false
}) => {
  const theme = useTheme();

  // Компонент заголовка
  const Header = () => (
    <Box
      sx={{
        height: headerHeight,
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}
    >
      {columns.map((column, index) => (
        <Box
          key={column.key || index}
          sx={{
            flex: column.width || 1,
            px: 2,
            fontWeight: 'bold',
            fontSize: '0.875rem',
            color: 'text.secondary'
          }}
        >
          {column.title}
        </Box>
      ))}
    </Box>
  );

  // Компонент строки
  const Row = ({ index, style }) => {
    const item = data[index];
    
    if (!item) {
      return (
        <div style={style}>
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', px: 2 }}>
            {columns.map((column, colIndex) => (
              <Box key={colIndex} sx={{ flex: column.width || 1, px: 2 }}>
                <Skeleton variant="text" width="80%" />
              </Box>
            ))}
          </Box>
        </div>
      );
    }

    return (
      <div style={style}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            cursor: 'pointer',
            borderBottom: 1,
            borderColor: 'divider',
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
          onClick={() => onRowClick(item, index)}
        >
          {columns.map((column, colIndex) => (
            <Box
              key={column.key || colIndex}
              sx={{
                flex: column.width || 1,
                px: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {column.render ? column.render(item[column.key], item, index) : item[column.key]}
            </Box>
          ))}
        </Box>
      </div>
    );
  };

  return (
    <Box sx={{ height: containerHeight, width: '100%' }}>
      <Header />
      <List
        height={containerHeight - headerHeight}
        itemCount={data.length}
        itemSize={rowHeight}
        overscanCount={10}
      >
        {Row}
      </List>
    </Box>
  );
};

export default VirtualizedProcessList;