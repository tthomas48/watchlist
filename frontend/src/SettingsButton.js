import Button from '@mui/material/Button';
import SettingsIcon from '@mui/icons-material/Settings';
import {useNavigate} from 'react-router-dom';

function SettingsButton() {
    const navigate = useNavigate();
    return (
        <Button aria-label="settings" volot="secondary" onClick={() => navigate('/settings')} startIcon={<SettingsIcon />}>
            Settings
        </Button>
    );
}
export default SettingsButton;