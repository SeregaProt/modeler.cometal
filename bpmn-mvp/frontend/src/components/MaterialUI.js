/**
 * Оптимизированный импорт Material-UI компонентов
 * Используем tree shaking для уменьшения размера bundle
 */

// Core components
export { 
  Box,
  Container,
  Grid,
  Stack,
  Paper
} from '@mui/material';

// Typography
export { 
  Typography 
} from '@mui/material';

// Inputs
export { 
  Button,
  IconButton,
  TextField,
  Autocomplete,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Switch
} from '@mui/material';

// Navigation
export { 
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  ListItemButton,
  Breadcrumbs,
  Link,
  Tabs,
  Tab
} from '@mui/material';

// Surfaces
export { 
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';

// Feedback
export { 
  Alert,
  AlertTitle,
  Snackbar,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Backdrop
} from '@mui/material';

// Data Display
export { 
  Avatar,
  AvatarGroup,
  Badge,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  List as MuiList
} from '@mui/material';

// Utils
export { 
  ClickAwayListener,
  Portal,
  Modal,
  Backdrop as MuiBackdrop,
  Fade,
  Grow,
  Slide,
  Zoom
} from '@mui/material';

// Layout
export { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Menu,
  MenuList,
  Popover,
  Popper
} from '@mui/material';

// Icons - импортируем только нужные
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
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  Brightness4,
  Brightness7,
  Menu as MenuIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon
} from '@mui/icons-material';

// Theme
export { 
  ThemeProvider,
  createTheme,
  useTheme
} from '@mui/material/styles';

export { 
  CssBaseline,
  GlobalStyles
} from '@mui/material';

// Hooks
export { 
  useMediaQuery 
} from '@mui/material';