import Button from '@mui/material/Button';
import StreamIcon from '@mui/icons-material/Stream';
import { useNavigate } from 'react-router-dom';

function ProvidersButton() {
  const navigate = useNavigate();
  return (
    <Button aria-label="providers" volot="secondary" onClick={() => navigate('/providers')} startIcon={<StreamIcon />}>
      Providers
    </Button>
  );
}
export default ProvidersButton;
