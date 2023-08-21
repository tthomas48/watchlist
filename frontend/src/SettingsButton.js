import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import {useNavigate} from 'react-router-dom';

function SettingsButton() {
    const navigate = useNavigate();
    return (
        <IconButton aria-label="settings" volot="secondary" onClick={() => navigate('/settings')}>
            <SettingsIcon />
        </IconButton>
    );
}
export default SettingsButton;