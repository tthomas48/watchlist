import React from 'react';

// import './App.css';
import {
  Outlet,
} from "react-router-dom";
// import Watchlist from './Watchlist';
import ListPicker from './ListPicker';
import PlayerPicker from './PlayerPicker';
import RefreshButton from './RefreshButton';
import SettingsButton from './SettingsButton';
import {Typography, Box, Toolbar, Container, AppBar} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2'; 
import { useLocalStorage } from "./hooks/useLocalStorage";


const listStorageKey = "watchlist.trakt_list";
const localStorageKey = "watchlist.player";
function App() {
  const [list, setList] = useLocalStorage(listStorageKey, "");
  const [player, setPlayer] = useLocalStorage(localStorageKey, "");
  

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
                <Grid xs={6}>
                  <RefreshButton list={list}></RefreshButton>
                </Grid>
                <Grid xs={6}>
                  <SettingsButton></SettingsButton>
                </Grid>
              </Grid>
            </Grid>                  
          </Toolbar>
        </Container>
      </AppBar>
      <Grid container spacing={2} className="App">
        <Grid xs={12}>
          <Outlet context={[list, player]}></Outlet>
        </Grid>
      </Grid>
    </Container>      
  );
}

export default App;