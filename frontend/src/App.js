import React from 'react';
import './App.css';
import Watchlist from './Watchlist';
import PlayerPicker from './PlayerPicker';
import Grid from '@mui/material/Unstable_Grid2'; 

function App() {
  return (
    <div className="App">
      <Grid container spacing={2}>
        <Grid  xs={8}>
          <h1>What To Watch</h1>
        </Grid>
        <Grid  xs={4}>
          <PlayerPicker></PlayerPicker>
        </Grid>
        <Grid  xs={12}>
          <Watchlist></Watchlist>
        </Grid>
      </Grid>
      
    </div>
  );
}

export default App;
