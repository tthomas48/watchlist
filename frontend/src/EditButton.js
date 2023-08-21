import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Edit from '@mui/icons-material/Edit';

function EditButton({ id }) {
    const navigate = useNavigate();

    const editAction = async () => {
        return navigate(`/watchable/${id}`);
    };

    return (
        <Button onClick={editAction} variant="outlined" startIcon={<Edit />}>
            Edit
        </Button>
    );
}
export default EditButton;