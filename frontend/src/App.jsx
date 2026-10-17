import { useState, useEffect } from 'react';
import {
  Link as RouterLink,
  Outlet,
} from 'react-router-dom';
import {
  Typography, Toolbar, Container, AppBar, IconButton, Menu, MenuItem, Box,
  ToggleButton, ToggleButtonGroup,
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
import BrowseFilterSummary from './BrowseFilterSummary';
import AddItem from './AddItem';
import StartVotingButton from './StartVotingButton';
import useLocalStorage from './hooks/useLocalStorage';
import MessageContextWrapper from './context/MessageContext';
import { WatchableEditProvider, useWatchableEdit } from './WatchableEditDialog';
import { WatchableDetailProvider, useWatchableDetail } from './WatchableDetailDialog';
import { defaultBrowseFilters } from './browseFilters';

function AppTitle() {
  const { closeEdit } = useWatchableEdit();
  const { closeDetail } = useWatchableDetail();

  return (
    <Typography
      variant="h6"
      noWrap
      component={RouterLink}
      to="/"
      onClick={() => {
        closeDetail();
        closeEdit();
      }}
      sx={{
        flexShrink: 0,
        color: 'inherit',
        textDecoration: 'none',
        cursor: 'pointer',
        '&:hover': {
          opacity: 0.85,
        },
      }}
    >
      Watchlist
    </Typography>
  );
}

const listStorageKey = 'watchlist.trakt_list';
const localStorageKey = 'watchlist.player';
const hiddenStorageKey = 'watchlist.hidden';
const sortStorageKey = 'watchlist.sort';
const filtersStorageKey = 'watchlist.browseFilters';
const viewModeByListKey = 'watchlist.viewModeByList';

function listIdFromList(list) {
  if (list?.ids?.trakt == null) return null;
  return String(list.ids.trakt);
}

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
  const [browseFilters, setBrowseFilters] = useLocalStorage(
    filtersStorageKey,
    defaultBrowseFilters(),
  );
  const [viewModeByList, setViewModeByList] = useLocalStorage(viewModeByListKey, {});

  const listId = listIdFromList(list);

  // Restore Flat/Shelves for the selected list (default flat)
  useEffect(() => {
    if (!listId) return;
    const stored = viewModeByList?.[listId];
    const nextMode = stored === 'shelves' ? 'shelves' : 'flat';
    setBrowseFilters((prev) => {
      const current = prev && typeof prev === 'object' ? prev : defaultBrowseFilters();
      if (current.viewMode === nextMode) return current;
      return { ...current, viewMode: nextMode };
    });
  // Only react to list changes; viewModeByList updates from the toggle handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  const setViewMode = (nextMode) => {
    if (!nextMode) return;
    setBrowseFilters((prev) => {
      const current = prev && typeof prev === 'object' ? prev : defaultBrowseFilters();
      return { ...current, viewMode: nextMode };
    });
    if (listId) {
      setViewModeByList((prev) => ({
        ...(prev && typeof prev === 'object' ? prev : {}),
        [listId]: nextMode,
      }));
    }
  };

  // 80px margin is space for remote control
  return (
    <Container maxWidth={false} sx={{ bgcolor: 'background.default', minHeight: '100vh', marginBottom: '80px' }}>
      <WatchableEditProvider>
      <StreamingSettingsProvider>
      <MessageContextWrapper>
      <WatchableDetailProvider>
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
              <AppTitle />
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
                  <MenuItem
                    onClick={(e) => {
                      // Keep menu open when toggling the vote-filter checkbox
                      if (e.target.closest?.('input[type="checkbox"]')
                        || e.target.closest?.('.MuiFormControlLabel-root')) {
                        e.stopPropagation();
                        return;
                      }
                      handleClose();
                    }}
                  >
                    <StartVotingButton list={list} player={player} filters={browseFilters} />
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
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 2,
                py: 1.5,
                minHeight: { xs: 48, sm: 52 },
              }}
            >
              <Box sx={{ minWidth: 140, maxWidth: 220, flexShrink: 0 }}>
                <SortPicker sort={sort} setSort={setSort} />
              </Box>
              <BrowseFilterSummary filters={browseFilters} setFilters={setBrowseFilters} />
              <ToggleButtonGroup
                exclusive
                size="small"
                value={browseFilters?.viewMode || 'flat'}
                onChange={(_e, next) => setViewMode(next)}
                aria-label="view mode"
                sx={{ flexShrink: 0 }}
              >
                <ToggleButton value="flat">Flat</ToggleButton>
                <ToggleButton value="shelves">Shelves</ToggleButton>
              </ToggleButtonGroup>
              <Box sx={{ flexShrink: 0, ml: { xs: 0, sm: 'auto' } }}>
                <AddItem list={list} />
              </Box>
            </Toolbar>
          </Container>
        </AppBar>
        <Box sx={{ bgcolor: 'background.default', p: 1 }}>
          <Grid container spacing={2} className="App">
            <Grid size={12}>
              <Outlet context={{
                list, player, showHidden, sort, browseFilters, setBrowseFilters,
              }}
              />
            </Grid>
          </Grid>
        </Box>
      </WatchableDetailProvider>
      </MessageContextWrapper>
      </StreamingSettingsProvider>
      </WatchableEditProvider>
    </Container >
  );
}

export default App;
