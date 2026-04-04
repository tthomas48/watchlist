import { useState } from 'react';
import {
  Outlet,
} from 'react-router-dom';
import {
  Typography, Toolbar, Container, AppBar, IconButton, Menu, MenuItem, Box,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import MenuIcon from '@mui/icons-material/Menu';
import ListPicker from './ListPicker';
import PlayerPicker from './PlayerPicker';
import RefreshButton from './RefreshButton';
import { StreamingSettingsProvider, StreamingSettingsMenuItem } from './StreamingSettingsDialog';
import ShowHiddenButton from './ShowHiddenButton';
import ReconnectButton from './ReconnectButton';
import SortPicker from './SortPicker';
import AddItem from './AddItem';
import useLocalStorage from './hooks/useLocalStorage';
import MessageContextWrapper from './context/MessageContext';
import { WatchableEditProvider } from './WatchableEditDialog';

const listStorageKey = 'watchlist.trakt_list';
const localStorageKey = 'watchlist.player';
const hiddenStorageKey = 'watchlist.hidden';
const sortStorageKey = 'watchlist.sort';
function App() {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const [list, setList] = useLocalStorage(listStorageKey, '');
  const [player, setPlayer] = useLocalStorage(localStorageKey, '');
  const [sort, setSort] = useLocalStorage(sortStorageKey, '');
  const [showHidden, setShowHidden] = useLocalStorage(hiddenStorageKey, false);

  // 80px margin is space for remote control
  return (
    <Container maxWidth={false} sx={{ bgcolor: 'background.default', minHeight: '100vh', marginBottom: '80px' }}>
      <WatchableEditProvider>
      <StreamingSettingsProvider>
      <MessageContextWrapper>
        <AppBar
          position="static"
          sx={{
            bgcolor: 'topBar.main',
            color: 'topBar.contrastText',
          }}
        >
          <Container maxWidth="xl">
            <Toolbar
              disableGutters
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 2,
                width: '100%',
                py: 1,
              }}
            >
              <Typography variant="h6" noWrap component="div" sx={{ flexShrink: 0 }}>
                Watchlist
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                  ml: 'auto',
                }}
              >
                <Box sx={{ minWidth: 160, maxWidth: 280 }}>
                  <ListPicker list={list} setList={setList} />
                </Box>
                <Box sx={{ minWidth: 140, maxWidth: 220 }}>
                  <PlayerPicker setPlayer={setPlayer} player={player} />
                </Box>
                <IconButton
                  id="basic-button"
                  aria-controls={open ? 'basic-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? 'true' : undefined}
                  onClick={handleClick}
                  color="inherit"
                  edge="end"
                >
                  <MenuIcon />
                </IconButton>
                <Menu
                  id="basic-menu"
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleClose}
                  MenuListProps={{
                    'aria-labelledby': 'basic-button',
                  }}
                >
                  <MenuItem onClick={handleClose}>
                    <RefreshButton list={list} sort={sort}></RefreshButton>
                  </MenuItem>
                  <MenuItem onClick={handleClose}>
                    <ShowHiddenButton showHidden={showHidden}
                      setShowHidden={setShowHidden}></ShowHiddenButton>
                  </MenuItem>
                  <MenuItem onClick={handleClose}>
                    <ReconnectButton player={player}></ReconnectButton>
                  </MenuItem>
                  <StreamingSettingsMenuItem onMenuClose={handleClose} />
                </Menu>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>
        <AppBar
          position="static"
          color="default"
          elevation={0}
          className="SortBar"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Container maxWidth="xl">
            <Toolbar
              disableGutters
              variant="dense"
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                gap: 2,
                py: 1,
                minHeight: { xs: 48, sm: 52 },
              }}
            >
              <Box sx={{ minWidth: 160, maxWidth: 320, flexShrink: 0 }}>
                <SortPicker sort={sort} setSort={setSort} />
              </Box>
              <Box sx={{ flexShrink: 0 }}>
                <AddItem list={list} />
              </Box>
            </Toolbar>
          </Container>
        </AppBar>
        <Box sx={{ bgcolor: 'background.default', p: 1 }}>
          <Grid container spacing={2} className="App">
            <Grid xs={12}>
              <Outlet context={[list, player, showHidden, sort]}></Outlet>
            </Grid>
          </Grid>
        </Box>
      </MessageContextWrapper>
      </StreamingSettingsProvider>
      </WatchableEditProvider>
    </Container >
  );
}

export default App;
