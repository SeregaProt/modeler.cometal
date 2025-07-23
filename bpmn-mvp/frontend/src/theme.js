import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: { primary: { main: '#0f62fe' } },
  typography: { fontFamily: 'Roboto, sans-serif' },
  components: { MuiButton: { styleOverrides: { root: { textTransform: 'none' } } } }
});

export default theme;
