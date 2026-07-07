import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import greenTheme from './theme';
import './index.css';
import App from './App';
import Watchlist from './Watchlist';
import { WatchableDeepLink } from './WatchableEditDialog';
import VoteHost from './VoteHost';
import VoteMobile from './VoteMobile';
import VoteMobileShell from './VoteMobileShell';

//const greenTheme = createTheme(themeOptions);

// Create a client
const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/vote/:code',
    element: <VoteMobileShell />,
    children: [
      {
        index: true,
        element: <VoteMobile />,
      },
    ],
  },
  {
    path: '/',
    element: <App />,
    children: [
      {
        element: <Watchlist />,
        index: true,
      },
      {
        path: '/settings',
        element: <Navigate to="/" replace />,
      },
      {
        path: '/streaming-access',
        element: <Navigate to="/" replace />,
      },
      {
        path: '/watchable/:id',
        element: <WatchableDeepLink />,
      },
      {
        path: '/vote-host/:code',
        element: <VoteHost />,
      },
    ],
  },
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
        <StyledEngineProvider injectFirst>
          <ThemeProvider theme={greenTheme}>
          <CssBaseline />
            <RouterProvider router={router} />
          </ThemeProvider>
        </StyledEngineProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
