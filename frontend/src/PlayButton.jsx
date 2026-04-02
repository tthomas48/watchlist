import { useContext } from 'react';
import Button from '@mui/material/Button';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Api from './service/api';
import { MessageContext } from './context/MessageContext';

function PlayButton({
  player, id, disabled = false,
}) {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const playAction = async () => {
    const result = await api.play(player, id);
    if (player !== 'browser') {
      return;
    }
    window.open(result.uri, 'watchlist_view_window', 'noreferrer');
  };

  return (
    <Button
      onClick={playAction}
      disabled={disabled}
      variant="outlined"
      color="primary"
      startIcon={<PlayArrow />}
      sx={{ flexGrow: 1 }}
    >
      Play
    </Button>
  );
}
export default PlayButton;
