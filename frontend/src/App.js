import React from 'react';
import './App.css';
import Watchlist from './Watchlist';
import ListPicker from './ListPicker';
import PlayerPicker from './PlayerPicker';
import RefreshButton from './RefreshButton';
import Grid from '@mui/material/Unstable_Grid2'; 
import { useLocalStorage } from "./hooks/useLocalStorage";

const localStorageKey = "watchlist.player";
const listStorageKey = "watchlist.trakt_list";
function App() {
  const [player, setPlayer] = useLocalStorage(localStorageKey, "");
  const [list, setList] = useLocalStorage(listStorageKey, "");

  return (
    <div className="App">
      <Grid container spacing={2}>
        <Grid xs={12}>
          <h1>What To Watch</h1>
        </Grid>
        <Grid xs={4}>
          <ListPicker setList={setList} list={list}></ListPicker>
        </Grid>
        <Grid xs={4}>
          <PlayerPicker setPlayer={setPlayer} player={player}></PlayerPicker>
        </Grid>
        <Grid xs={2}>
          <RefreshButton list={list}></RefreshButton>
        </Grid>
        <Grid xs={12}>
          <Watchlist list={list} player={player}></Watchlist>
        </Grid>
      </Grid>
      
    </div>
  );
}

export default App;
