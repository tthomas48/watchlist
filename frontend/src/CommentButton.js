import { Fragment, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  IconButton, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import CommentIcon from '@mui/icons-material/Comment';
import AddCommentIcon from '@mui/icons-material/AddComment';

function CommentButton({ item, saveWatchable }) {
  const { register, getValues } = useForm();

  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const saveComment = useMutation({
    mutationFn: async (watchable) => {
      const values = getValues();
      watchable.comment = values.comment;
      await saveWatchable(watchable);
      setOpen(false);
    },
  });

  const dialog = (<Dialog open={open} onClose={handleClose}>
    <DialogTitle>Comment</DialogTitle>
    <DialogContent>
      <TextField
        autoFocus
        variant="standard"
        id="comment"
        label="Comment"
        multiline
        maxRows={4}
        {...register('comment')}
        defaultValue={item.comment}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={handleClose}>Close</Button>
      <Button onClick={() => {
        saveComment.mutate(item);
      }}>Save</Button>
    </DialogActions>
  </Dialog>);
  if (item.comment) {
    return (
      <Fragment>
        <IconButton variant="outlined" onClick={handleOpen}><CommentIcon /></IconButton>
        {dialog}
      </Fragment>);
  }

  return (
    <Fragment>
      <IconButton variant="outlined" onClick={handleOpen}><AddCommentIcon /></IconButton>
      {dialog}
    </Fragment>);
}
export default CommentButton;
