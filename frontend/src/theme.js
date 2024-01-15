import { ThemeOptions } from '@mui/material/styles';

const themeOptions: ThemeOptions = {
  palette: {
    primary: {
      main: '#e5b0a4',
      dark: '#d17c6b',
    },
    secondary: {
      main: '#f0dedd',
    },
    background: {
      default: '#0c4524',
      paper: '#f5f3f5',
    },
    text: {
      paper: '#000000',
      primary: '#f5f3f5',
    },
    typography: {
      fontWeightLight: 300,
      h5: {
        fontSize: '1rem',
        fontWeight: 600,
        overflow: 'hidden',
      },
    },
  },
};
export default themeOptions;
