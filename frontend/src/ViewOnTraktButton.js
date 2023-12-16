import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

function ViewOnTraktButton({ traktId, mediaType }) {
    const navigate = useNavigate();

    const viewAction = async () => {
        const url = `https://trakt.tv/${mediaType}/${traktId}`;
        window.open(url, "_watchlist", "noreferrer");
    };

    return (
        <Button onClick={viewAction} startIcon={<OpenInNewIcon />}>
            View on Trakt
        </Button>
    );
}
export default ViewOnTraktButton;