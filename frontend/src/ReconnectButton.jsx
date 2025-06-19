import { useContext } from 'react';
import Button from '@mui/material/Button';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';

function ReconnectButton({ player }) {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);

  if (player !== 'adb-googletv') {
    return (null);
  }

  return (
    <Button aria-label="reconnect adb" volot="secondary" onClick={() => api.reconnect()} startIcon={<SettingsInputComponentIcon />}>
      Reconnect
    </Button>
  );
}
export default ReconnectButton;
