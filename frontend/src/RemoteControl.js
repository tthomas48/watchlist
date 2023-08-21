import {Fab} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2'; 
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import ArrowCircleLeftIcon from '@mui/icons-material/ArrowCircleLeft';
import ArrowCircleRightIcon from '@mui/icons-material/ArrowCircleRight';
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AdjustIcon from '@mui/icons-material/Adjust';
import HomeIcon from '@mui/icons-material/Home';
import { pushButton } from './api';

function RemoteControl({ player }) {
    const pushButtonAction = async (button) => {
        await pushButton(player, button);
    };

    if (player !== "googletv") {
        return;
    }
    
    // TODO: This should only show if the player is Android TV
    return (
        <Grid container spacing={1}>
            <Grid item xs={4}></Grid>
            <Grid item xs={4}>
                <Fab variant="extended" onClick={() => pushButtonAction("up")}>
                    <ArrowCircleUpIcon />
                </Fab>
            </Grid>
            <Grid item xs={4}></Grid>
            <Grid item xs={4}>
                <Fab variant="extended" onClick={() => pushButtonAction("left")}>
                    <ArrowCircleLeftIcon />
                </Fab>
            </Grid>
            <Grid item xs={4}>
                <Fab variant="extended" onClick={() => pushButtonAction("enter")}>
                    <AdjustIcon />
                </Fab>
            </Grid>
            <Grid item xs={4}>
                <Fab variant="extended" onClick={() => pushButtonAction("right")}>
                    <ArrowCircleRightIcon />
                </Fab>
            </Grid>
            <Grid item xs={4}>
            <Fab variant="extended" onClick={() => pushButtonAction("back")}>
                    <ArrowBackIcon />
                </Fab>                
            </Grid>
            <Grid item xs={4}>
                <Fab variant="extended" onClick={() => pushButtonAction("down")}>
                    <ArrowCircleDownIcon />
                </Fab>
            </Grid>
            <Grid item xs={4}>
                <Fab variant="extended" onClick={() => pushButtonAction("home")}>
                    <HomeIcon />
                </Fab>
            </Grid>
        </Grid>            
  );
}

export default RemoteControl;