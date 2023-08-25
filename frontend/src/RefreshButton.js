import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import {refresh} from './api';

function RefreshButton({ list }) {
    return (
        <Button aria-label="refresh list" volot="secondary" onClick={() => refresh(list)} startIcon={<RefreshIcon />}>
             Refresh
        </Button>
    );
}
export default RefreshButton;