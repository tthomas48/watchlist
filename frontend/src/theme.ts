import { createTheme } from '@mui/material/styles';

// Dark green page background (CssBaseline) with light Paper surfaces — text.* must read on paper.
const theme = {
  palette: {
    primary: {
      main: '#e5b0a4',
      dark: '#d17c6b',
      contrastText: '#1a1a1a',
    },
    secondary: {
      main: '#f0dedd',
    },
    background: {
      default: '#0c4524',
      paper: '#f5f3f5',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
  typography: {
    fontWeightLight: 300,
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
      overflow: 'hidden',
    },
  },
} as const;

type CustomTheme = {
  [Key in keyof typeof theme]: typeof theme[Key];
};

declare module '@mui/material/styles/createTheme' {
  interface Theme extends CustomTheme {}
  interface ThemeOptions extends CustomTheme {}
}

export default createTheme(theme);
