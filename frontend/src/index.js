import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import StyledEngineProvider from '@mui/material/StyledEngineProvider';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { themeOptions } from './theme';
import './index.css';
import App from './App';
import Settings from './Settings';
import Watchlist from './Watchlist';
import Watchable from './Watchable';

const greenTheme = createTheme(themeOptions);

// Create a client
const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        element: <Watchlist />,
        index: true,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
      {
        path: "/watchable/:id",
        element: <Watchable />,
      }      
    ]
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
  </React.StrictMode>
);