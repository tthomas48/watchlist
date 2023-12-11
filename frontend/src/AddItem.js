import Button from '@mui/material/Button';
import AddCircleIcon from '@mui/icons-material/AddCircle';

const AddItem = () => {

    const addAction = async () => {
        const url = 'https://trakt.tv/search';
        window.open(url, "_watchlist", "noreferrer");
    };

    return (
        <Button onClick={addAction} startIcon={<AddCircleIcon />}>
            Add
        </Button>
    );
};
export default AddItem;