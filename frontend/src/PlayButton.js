import Button from '@mui/material/Button';
import PlayArrow from '@mui/icons-material/PlayArrow';
import { play } from './api.js'

function PlayButton({ player, id }) {
    const playAction = async () => {
        const result = await play(player, id);
        if (player === "googletv" || player === "firetv") {
            // NOOP this is handled on the server
            console.log(result);
            return;
        }
        window.open(result.uri, "watchlist_view_window", "noreferrer");
    };

    return (
        <Button onClick={playAction} variant="outlined" startIcon={<PlayArrow />} sx={{flexGrow: 1}}>
            Play
        </Button>
    );
}
export default PlayButton;