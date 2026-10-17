import { Fragment, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  IconButton, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import CommentIcon from '@mui/icons-material/Comment';
import AddCommentIcon from '@mui/icons-material/AddComment';

function CommentButton({
  item, saveWatchable, variant = 'icon', buttonRef = null,
}) {
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

  const dialog = (
    <Dialog open={open} onClose={handleClose}>
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
        }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );

  const label = item.comment ? 'Comment' : 'Add comment';
  const Icon = item.comment ? CommentIcon : AddCommentIcon;

  if (variant === 'menu') {
    return (
      <Fragment>
        <Button ref={buttonRef} onClick={handleOpen} startIcon={<Icon />}>
          {label}
        </Button>
        {dialog}
      </Fragment>
    );
  }

  return (
    <Fragment>
      <IconButton
        ref={buttonRef}
        color="primary"
        variant="outlined"
        onClick={handleOpen}
        aria-label={label}
      >
        <Icon />
      </IconButton>
      {dialog}
    </Fragment>
  );
}
export default CommentButton;
