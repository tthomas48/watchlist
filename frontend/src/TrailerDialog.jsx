import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Typography,
} from '@mui/material';
import ReactPlayer from 'react-player';
import { isYouTubeTrailerUrl } from './trailerUrl';

function canEmbedTrailer(url) {
  if (!url) {
    return false;
  }
  if (typeof ReactPlayer.canPlay === 'function' && ReactPlayer.canPlay(url)) {
    return true;
  }
  return isYouTubeTrailerUrl(url);
}

function TrailerDialog({
  open, onClose, url, title,
}) {
  const embeddable = canEmbedTrailer(url);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="trailer-dialog-title"
    >
      <DialogTitle id="trailer-dialog-title">
        {title ? `${title} — Trailer` : 'Trailer'}
      </DialogTitle>
      <DialogContent dividers>
        {open && url && embeddable && (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              pt: '56.25%',
              bgcolor: '#000',
            }}
          >
            <ReactPlayer
              src={url}
              playing
              controls
              width="100%"
              height="100%"
              style={{ position: 'absolute', top: 0, left: 0 }}
            />
          </Box>
        )}
        {open && url && !embeddable && (
          <Typography variant="body2">
            This trailer can&apos;t be embedded here.{' '}
            <Link href={url} target="_blank" rel="noreferrer">
              Open in a new tab
            </Link>
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default TrailerDialog;
