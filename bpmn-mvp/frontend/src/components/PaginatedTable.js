import React from 'react';
import { 
  TablePagination, 
  Box, 
  CircularProgress,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight
} from '@mui/icons-material';

/**
 * Компонент для отображения пагинированных данных
 */
const PaginatedTable = ({ 
  data = [], 
  pagination = {}, 
  onPageChange, 
  onRowsPerPageChange,
  loading = false,
  children,
  emptyMessage = "Нет данных для отображения",
  loadingMessage = "Загрузка данных..."
}) => {
  const {
    page = 1,
    limit = 10,
    total = 0,
    totalPages = 0,
    hasNext = false,
    hasPrev = false
  } = pagination;

  const handleChangePage = (event, newPage) => {
    if (onPageChange) {
      onPageChange(newPage + 1); // MUI uses 0-based, our API uses 1-based
    }
  };

  const handleChangeRowsPerPage = (event) => {
    const newLimit = parseInt(event.target.value, 10);
    if (onRowsPerPageChange) {
      onRowsPerPageChange(newLimit);
    }
  };

  const handleFirstPageButtonClick = () => {
    if (onPageChange) {
      onPageChange(1);
    }
  };

  const handleLastPageButtonClick = () => {
    if (onPageChange) {
      onPageChange(totalPages);
    }
  };

  const handleBackButtonClick = () => {
    if (onPageChange && hasPrev) {
      onPageChange(page - 1);
    }
  };

  const handleNextButtonClick = () => {
    if (onPageChange && hasNext) {
      onPageChange(page + 1);
    }
  };

  // Кастомные действия пагинации
  const TablePaginationActions = (props) => {
    const { count, page: muiPage, rowsPerPage, onPageChange } = props;

    return (
      <Box sx={{ flexShrink: 0, ml: 2.5 }}>
        <Tooltip title="Первая страница">
          <span>
            <IconButton
              onClick={handleFirstPageButtonClick}
              disabled={!hasPrev}
              aria-label="первая страница"
            >
              <FirstPageIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Предыдущая страница">
          <span>
            <IconButton
              onClick={handleBackButtonClick}
              disabled={!hasPrev}
              aria-label="пр��дыдущая страница"
            >
              <KeyboardArrowLeft />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Следующая страница">
          <span>
            <IconButton
              onClick={handleNextButtonClick}
              disabled={!hasNext}
              aria-label="следующая страница"
            >
              <KeyboardArrowRight />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Последняя страница">
          <span>
            <IconButton
              onClick={handleLastPageButtonClick}
              disabled={!hasNext}
              aria-label="последняя страница"
            >
              <LastPageIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={4}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          {loadingMessage}
        </Typography>
      </Box>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={4}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Контент */}
      {children}
      
      {/* Пагинация */}
      {total > 0 && (
        <TablePagination
          component="div"
          count={total}
          page={page - 1} // Convert to 0-based for MUI
          onPageChange={handleChangePage}
          rowsPerPage={limit}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 20, 50]}
          labelRowsPerPage="Строк на странице:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} из ${count !== -1 ? count : `более чем ${to}`}`
          }
          ActionsComponent={TablePaginationActions}
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            '& .MuiTablePagination-toolbar': {
              paddingLeft: 2,
              paddingRight: 2,
            },
            '& .MuiTablePagination-selectLabel': {
              marginBottom: 0,
            },
            '& .MuiTablePagination-displayedRows': {
              marginBottom: 0,
            }
          }}
        />
      )}
      
      {/* Дополнительная информация */}
      {total > 0 && (
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Страница {page} из {totalPages} • Всего записей: {total}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PaginatedTable;