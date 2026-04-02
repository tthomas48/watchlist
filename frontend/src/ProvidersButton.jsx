import Button from '@mui/material/Button';
import StreamIcon from '@mui/icons-material/Stream';
import { useNavigate } from 'react-router-dom';

function ProvidersButton() {
  const navigate = useNavigate();
  return (
    <Button aria-label="streaming access" color="secondary" onClick={() => navigate('/streaming-access')} startIcon={<StreamIcon />}>
      Streaming
    </Button>
  );
}
export default ProvidersButton;
