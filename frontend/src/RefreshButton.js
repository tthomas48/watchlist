import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import {refresh} from './api';

function RefreshButton(list) {
    return (
        <IconButton aria-label="refresh list" volot="secondary" onclick={() => refresh(list)}>
            <RefreshIcon />
        </IconButton>
    );
}
export default RefreshButton;