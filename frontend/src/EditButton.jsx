import Button from '@mui/material/Button';
import Edit from '@mui/icons-material/Edit';
import { useWatchableEdit } from './WatchableEditDialog';

function EditButton({ id }) {
  const { openEdit } = useWatchableEdit();

  return (
    <Button onClick={() => openEdit(id)} startIcon={<Edit />}>
      Edit
    </Button>
  );
}
export default EditButton;
