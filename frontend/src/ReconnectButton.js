import Button from '@mui/material/Button';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import {reconnect} from './api';

function ReconnectButton({ player }) {
    if (player !== "googletv") {
        return;
    }

    return (
        <Button aria-label="reconnect adb" volot="secondary" onClick={() => reconnect()} startIcon={<SettingsInputComponentIcon />}>
             Reconnect
        </Button>
    );
}
export default ReconnectButton;