import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Typography,
} from '@mui/material';
import { getCroppedImageBlob } from './cropImage';

/**
 * Circular zoom/crop dialog for avatar uploads.
 * @param {{ open: boolean, imageSrc: string|null, onCancel: () => void, onApply: (file: File) => void|Promise<void>, applying?: boolean }} props
 */
function AvatarCropDialog({
  open, imageSrc, onCancel, onApply, applying = false,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleEnter = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError('');
  };

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setBusy(true);
    setError('');
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, {
        size: 512,
        mimeType: 'image/jpeg',
        quality: 0.92,
      });
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      await onApply(file);
    } catch (e) {
      setError(e?.message || 'Could not crop image');
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || applying || !croppedAreaPixels;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: handleEnter }}
      aria-labelledby="avatar-crop-dialog-title"
    >
      <DialogTitle id="avatar-crop-dialog-title">Crop avatar</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: 320,
            bgcolor: '#111',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              minZoom={1}
              maxZoom={3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </Box>
        <Box sx={{ mt: 2, px: 1 }}>
          <Typography variant="caption" color="text.secondary" id="avatar-zoom-label">
            Zoom
          </Typography>
          <Slider
            aria-labelledby="avatar-zoom-label"
            value={zoom}
            min={1}
            max={3}
            step={0.05}
            onChange={(_e, value) => setZoom(value)}
          />
          <Typography variant="body2" color="text.secondary">
            Drag to reposition. Use the slider or scroll to zoom.
          </Typography>
          {error && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy || applying}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={disabled}
        >
          {busy || applying ? 'Saving…' : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AvatarCropDialog;
