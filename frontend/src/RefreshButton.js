import { useContext } from 'react';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';

function RefreshButton({ list }) {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);

  return (
    <Button aria-label="refresh list" volot="secondary" onClick={async () => api.refresh(list)} startIcon={<RefreshIcon />}>
      Refresh
    </Button>
  );
}
export default RefreshButton;
