import { useContext, useState } from 'react';
import Button from '@mui/material/Button';
import OndemandVideo from '@mui/icons-material/OndemandVideo';
import Api from './service/api';
import { MessageContext } from './context/MessageContext';
import TrailerDialog from './TrailerDialog';

function TrailerButton({
  id,
  trailerUrl: initialTrailerUrl = null,
  title = null,
  disabled = false,
  /** 'button' for card actions; 'menu' for overflow-style text button */
  variant = 'button',
  sx,
  buttonRef = null,
}) {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(initialTrailerUrl);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const isMenu = variant === 'menu';
  const buttonSx = sx ?? (isMenu ? undefined : { flexGrow: 1 });

  const handleOpen = async () => {
    if (url) {
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const result = await api.getTrailer(id);
      const next = result?.trailerUrl || null;
      if (next) {
        setUrl(next);
        setOpen(true);
      } else {
        setUnavailable(true);
        messageContext.sendMessage({
          message: 'No trailer available',
          severity: 'info',
          open: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  if (unavailable && !url) {
    return null;
  }

  return (
    <>
      <Button
        ref={buttonRef}
        onClick={handleOpen}
        disabled={disabled || loading}
        variant={isMenu ? 'text' : 'outlined'}
        color="primary"
        startIcon={<OndemandVideo />}
        sx={buttonSx}
      >
        {loading ? 'Trailer…' : 'Trailer'}
      </Button>
      <TrailerDialog
        open={open}
        onClose={handleClose}
        url={url}
        title={title}
      />
    </>
  );
}

export default TrailerButton;
