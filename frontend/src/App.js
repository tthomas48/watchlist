import React from 'react';
import './App.css';
import Watchlist from './Watchlist';
import ListPicker from './ListPicker';
import PlayerPicker from './PlayerPicker';
import RefreshButton from './RefreshButton';
import Grid from '@mui/material/Unstable_Grid2'; 
import { useLocalStorage } from "./hooks/useLocalStorage";

const localStorageKey = "watchlist.trakt_list";
function App() {
  const [list, setList] = useLocalStorage(localStorageKey, "");

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
          <PlayerPicker></PlayerPicker>
        </Grid>
        <Grid xs={2}>
          <RefreshButton></RefreshButton>
        </Grid>
        <Grid xs={12}>
          <Watchlist list={list}></Watchlist>
        </Grid>
      </Grid>
      
    </div>
  );
}

export default App;
