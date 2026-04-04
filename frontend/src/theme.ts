import { alpha, createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    topBar: { main: string; contrastText: string };
  }
  interface PaletteOptions {
    topBar?: { main?: string; contrastText?: string };
  }
}

// Black page (CssBaseline) with charcoal Paper; pink primary, muted green secondary.
export default createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#e5b0a4',
      dark: '#d17c6b',
      contrastText: '#1a1a1a',
    },
    secondary: {
      main: '#3d6b4f',
      contrastText: '#e8ebe9',
    },
    background: {
      default: '#000000',
      paper: '#1e1e1e',
    },
    topBar: {
      main: '#0c4524',
      contrastText: 'rgba(255, 255, 255, 0.92)',
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
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: Number(theme.shape.borderRadius) * 2,
          boxShadow: '0 24px 48px rgba(0,0,0,0.55)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
        }),
      },
    },
    MuiTabs: {
      defaultProps: {
        indicatorColor: 'primary',
        textColor: 'primary',
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:not(:last-of-type)': {
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.45)}`,
          },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.common.white, 0.06),
          '&:hover': {
            backgroundColor: alpha(theme.palette.common.white, 0.09),
          },
          '&.Mui-focused': {
            backgroundColor: alpha(theme.palette.common.white, 0.08),
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.common.white, 0.22),
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.common.white, 0.35),
          },
        }),
        input: ({ theme }) => ({
          color: theme.palette.text.primary,
          '&::placeholder': {
            color: theme.palette.text.secondary,
            opacity: 1,
          },
          '&.Mui-disabled': {
            color: theme.palette.text.disabled,
            WebkitTextFillColor: theme.palette.text.disabled,
          },
          '&:-webkit-autofill': {
            borderRadius: 'inherit',
            WebkitBoxShadow: `0 0 0 100px ${alpha(theme.palette.common.white, 0.08)} inset`,
            WebkitTextFillColor: `${theme.palette.text.primary}`,
          },
        }),
      },
    },
  },
});
