import { useState } from 'react';
import {
  Outlet,
} from 'react-router-dom';
import {
  Typography, Toolbar, Container, AppBar, IconButton, Menu, MenuItem, Paper,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import MenuIcon from '@mui/icons-material/Menu';
import ListPicker from './ListPicker';
import PlayerPicker from './PlayerPicker';
import RefreshButton from './RefreshButton';
import ProvidersButton from './ProvidersButton';
import SettingsButton from './SettingsButton';
import ShowHiddenButton from './ShowHiddenButton';
import ReconnectButton from './ReconnectButton';
import SortPicker from './SortPicker';
import AddItem from './AddItem';
import useLocalStorage from './hooks/useLocalStorage';
import MessageContextWrapper from './context/MessageContext';

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
    <Container sx={{ marginBottom: '80px' }}>
      <MessageContextWrapper>
        <AppBar position="static">
          <Container maxWidth="xl">
            <Toolbar disableGutters>
              <Grid container spacing={2} xs={12}>
                <Grid xs={12} md={5}>
                  <Typography variant="h6" noWrap>Watchlist</Typography>
                </Grid>
                <Grid xs={6} md={3}>
                  <ListPicker list={list} setList={setList}></ListPicker>
                </Grid>
                <Grid xs={5} md={3}>
                  <PlayerPicker setPlayer={setPlayer} player={player}></PlayerPicker>
                </Grid>
                <Grid xs={1} md={1} container>
                  <IconButton
                    id="basic-button"
                    aria-controls={open ? 'basic-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={handleClick}
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
                    <MenuItem onClick={handleClose}>
                      <ProvidersButton></ProvidersButton>
                    </MenuItem>
                    <MenuItem onClick={handleClose}>
                      <SettingsButton></SettingsButton>
                    </MenuItem>
                  </Menu>
                </Grid>
              </Grid>
            </Toolbar>
          </Container>
        </AppBar>
        <Paper elevation={0} variant="outlined" square sx={{ padding: '8px' }}>
          <Grid container direction="row" justifyContent="space-between" alignItems="flex-end" className="SortBar" spacing={2}>
            <Grid xs={5}>
              <SortPicker sort={sort} setSort={setSort} />
            </Grid>
            <Grid xs={3}>
              <AddItem list={list} />
            </Grid>
          </Grid>
          <Grid container spacing={2} className="App">
            <Grid xs={12}>
              <Outlet context={[list, player, showHidden, sort]}></Outlet>
            </Grid>
          </Grid>
        </Paper>
      </MessageContextWrapper>
    </Container >
  );
}

export default App;
