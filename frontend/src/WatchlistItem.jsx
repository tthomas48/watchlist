import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useQueryClient,
  useMutation,
} from '@tanstack/react-query';
import {
  Alert,
  CardActionArea,
  CardHeader,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PlayButton from './PlayButton';
import EditButton from './EditButton';
import ViewOnTraktButton from './ViewOnTraktButton';
import HideButton from './HideButton';
import CommentButton from './CommentButton';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';

function WatchlistItem({
  item,
  player,
  saveWatchable,
  notifications,
  list,
}) {
  const messageContext = useContext(MessageContext);
  const [closedNotification, setClosedNotification] = useState(false);
  const queryClient = useQueryClient();
  const api = new Api(messageContext);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  let notification = null;
  if (notifications) {
    for (let i = 0; i < notifications.length; i += 1) {
      if (notifications[i].watchable_id === item.id) {
        notification = notifications[i];
        break;
      }
    }
  }

  const { mutate } = useMutation({
    mutationFn: async (n) => {
      // FIXME: this is not deleting fast enough
      setClosedNotification(true);
      await api.deleteNotification(list, n.id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', list] });
    },
  });

  const missingUrlWarning = (watchable) => {
    if (!watchable.web_url) {
      return (
        <CardContent>
          <Alert severity="warning">No url has been specified.</Alert>
        </CardContent>
      );
    }
    return (null);
  };

  const showNotification = (n) => {
    if (n != null && !closedNotification) {
      return (
        <CardContent>
          <Alert severity="info" onClose={() => mutate(n)}>{n.message}</Alert>
        </CardContent>
      );
    }
    return (null);
  };
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const editAction = async () => navigate(`/watchable/${item.id}`);

  return (
    <Card key={item.title} sx={{
      backgroundColor: '#278056',
    }}>
      <CardActionArea onClick={editAction}>
        <CardHeader title={item.title} sx={{
          fontSize: '1.0rem',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}></CardHeader>
        <CardMedia component="img" image={`/api/img/${item.id}`} alt={item.title} />
        {missingUrlWarning(item)}
      </CardActionArea>
      {showNotification(notification)}
      <CardActions disableSpacing>
        <PlayButton player={player} id={item.id}></PlayButton>
        <CommentButton item={item} saveWatchable={saveWatchable}></CommentButton>
        <Button
          id="basic-button"
          aria-controls={open ? 'basic-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
        >
          <MenuIcon />
        </Button>
        <Menu
          id="basic-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
          }}
        >
          <MenuItem onClick={handleClose}><EditButton id={item.id}></EditButton></MenuItem>
          <MenuItem onClick={handleClose}>
            <ViewOnTraktButton disabled={item.local} traktId={item.trakt_id}
              mediaType={item.media_type}></ViewOnTraktButton>
          </MenuItem>
          <MenuItem onClick={handleClose}>
            <HideButton item={item} saveWatchable={saveWatchable}></HideButton>
          </MenuItem>
        </Menu>
      </CardActions>
    </Card>);
}
export default WatchlistItem;
