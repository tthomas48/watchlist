import { useState } from 'react';
import {
  Outlet,
} from "react-router-dom";
import ListPicker from './ListPicker';
import PlayerPicker from './PlayerPicker';
import RefreshButton from './RefreshButton';
import SettingsButton from './SettingsButton';
import ShowHiddenButton from './ShowHiddenButton';
import {Typography,  Toolbar, Container, AppBar, IconButton, Menu, MenuItem} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2'; 
import MenuIcon from '@mui/icons-material/Menu';
import { useLocalStorage } from "./hooks/useLocalStorage";


const listStorageKey = "watchlist.trakt_list";
const localStorageKey = "watchlist.player";
const hiddenStorageKey = "watchlist.hidden";
function App() {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
      setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
      setAnchorEl(null);
  };

  const [list, setList] = useLocalStorage(listStorageKey, "");
  const [player, setPlayer] = useLocalStorage(localStorageKey, "");
  const [showHidden, setShowHidden] = useLocalStorage(hiddenStorageKey, false);
  

  return (    
    <Container>
      <AppBar position="static">
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <Grid container spacing={2} xs={12}>
              <Grid xs={12} md={5}>
                <Typography variant="h6" noWrap>What To Watch</Typography>
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
                  <MenuItem onClick={handleClose}><RefreshButton list={list}></RefreshButton></MenuItem>
                  <MenuItem onClick={handleClose}><ShowHiddenButton showHidden={showHidden} setShowHidden={setShowHidden}></ShowHiddenButton></MenuItem>
                  <MenuItem onClick={handleClose}><SettingsButton></SettingsButton></MenuItem>
                  
                </Menu>
              </Grid>
            </Grid>                  
          </Toolbar>
        </Container>
      </AppBar>
      <Grid container spacing={2} className="App">
        <Grid xs={12}>
          <Outlet context={[list, player, showHidden]}></Outlet>
        </Grid>
      </Grid>
    </Container>      
  );
}

export default App;