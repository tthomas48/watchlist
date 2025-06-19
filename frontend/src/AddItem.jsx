import { useState, useContext } from 'react';
import { styled, alpha } from '@mui/material/styles';
import {
  Button, Menu, MenuItem, Dialog, DialogTitle, DialogContent, TextField, DialogActions,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';

const StyledMenu = styled((props) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'right',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: 6,
    marginTop: theme.spacing(1),
    minWidth: 180,
    color:
      theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
    boxShadow:
      'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
    '& .MuiMenu-list': {
      padding: '4px 0',
    },
    '& .MuiMenuItem-root': {
      '& .MuiSvgIcon-root': {
        fontSize: 18,
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1.5),
      },
      '&:active': {
        backgroundColor: alpha(
          theme.palette.primary.main,
          theme.palette.action.selectedOpacity,
        ),
      },
    },
  },
}));

const AddItem = ({ list }) => {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const queryClient = useQueryClient();
  const { register, getValues } = useForm();
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const open = Boolean(anchorEl);

  const handleClose = () => {
    setAnchorEl(null);
  };
  const addAction = async () => {
    handleClose();
    const url = 'https://trakt.tv/search';
    window.open(url, '_watchlist', 'noreferrer');
  };
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDialogOpen = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const values = getValues();
      const watchable = {
        local: true,
        title: values.title,
        trakt_list_id: list.ids.trakt,
        noautoadvance: true,
      };
      await api.createWatchable(watchable);
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      setDialogOpen(false);
      handleClose();
    },
  });

  const dialog = (<Dialog open={dialogOpen} onClose={handleDialogClose}>
    <DialogTitle>Add Watchable</DialogTitle>
    <DialogContent>
      <TextField
        autoFocus
        variant="standard"
        id="title"
        label="Title"
        multiline
        maxRows={4}
        {...register('title')}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={handleDialogClose}>Close</Button>
      <Button onClick={() => {
        createMutation.mutate();
      }}>Save</Button>
    </DialogActions>
  </Dialog>);

  return (
    <div>
      <Button variant="outlined" onClick={handleClick}
        aria-controls={open ? 'demo-customized-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        disableElevation
        endIcon={<KeyboardArrowDownIcon />}
      >
        Add
      </Button>
      <StyledMenu
        id="demo-customized-menu"
        MenuListProps={{
          'aria-labelledby': 'demo-customized-button',
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={addAction} disableRipple>
          <AddCircleIcon />
          Add on Trakt
        </MenuItem>
        <MenuItem onClick={handleDialogOpen} disableRipple>
          <AddCircleIcon />
          Add Local
        </MenuItem>
      </StyledMenu>
      {dialog}
    </div>
  );
};
export default AddItem;
