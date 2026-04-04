import { useState, useContext } from 'react';
import {
  useQueryClient,
  useMutation,
} from '@tanstack/react-query';
import {
  Alert,
  Box,
  CardActionArea,
  CardHeader,
  Card,
  CardActions,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import LiveTv from '@mui/icons-material/LiveTv';
import PlayButton from './PlayButton';
import EditButton from './EditButton';
import ViewOnTraktButton from './ViewOnTraktButton';
import HideButton from './HideButton';
import CommentButton from './CommentButton';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';
import getStreamingServiceIcon from './streamingServiceIcon';
import { useWatchableEdit } from './WatchableEditDialog';

const overlayAlertSx = {
  '& .MuiAlert-root': {
    borderRadius: 0,
    py: 0,
    alignItems: 'center',
  },
  '& .MuiAlert-message': { py: 0.5, width: '100%' },
  '& .MuiAlert-icon': { py: 0, mr: 0.5, alignSelf: 'center' },
};

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
  const { openEdit } = useWatchableEdit();
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

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const editAction = () => openEdit(item.id);

  const showInfoNotification = notification != null && !closedNotification;
  const serviceIcon = getStreamingServiceIcon(item.streaming_service_id);

  return (
    <Card
      key={item.title}
      sx={(theme) => ({
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 48px)`,
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
        '&:hover': {
          boxShadow: '0 14px 36px rgba(0,0,0,0.55)',
          transform: 'translateY(-2px)',
        },
        '&:hover .watchlist-poster-img': {
          transform: 'scale(1.02)',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '& .watchlist-poster-img': { transition: 'none' },
          '&:hover': {
            transform: 'none',
          },
          '&:hover .watchlist-poster-img': {
            transform: 'none',
          },
        },
      })}
    >
      <CardActionArea
        onClick={editAction}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          minHeight: 0,
        }}
      >
        <CardHeader
          title={item.title}
          titleTypographyProps={{
            noWrap: true,
            sx: {
              color: 'primary.main',
              fontSize: '1rem',
              fontWeight: 600,
            },
          }}
          sx={{
            overflow: 'hidden',
            flexShrink: 0,
            '& .MuiCardHeader-content': { overflow: 'hidden' },
          }}
        />
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '2 / 3',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Box
              className="watchlist-poster-img"
              component="img"
              src={`/api/img/${item.id}`}
              alt={item.title}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center',
                display: 'block',
                transition: 'transform 0.25s ease',
              }}
            />
          </Box>

          {serviceIcon && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 1,
                pointerEvents: 'none',
                width: 48,
                height: 48,
                borderRadius: '50%',
                overflow: 'hidden',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.28)',
                border: '2px solid rgba(255,255,255,0.35)',
              }}
            >
              {serviceIcon.type === 'img' ? (
                <Box
                  component="img"
                  src={serviceIcon.src}
                  alt={serviceIcon.alt}
                  sx={{
                    width: 44,
                    height: 44,
                    objectFit: 'contain',
                    // Simple Icons / black SVGs read on accent; keep Netflix red etc. visible
                    filter: 'drop-shadow(0 0 0.5px rgba(0,0,0,0.15))',
                  }}
                />
              ) : (
                <LiveTv
                  sx={{ width: 44, height: 44, color: 'primary.contrastText' }}
                  titleAccess={serviceIcon.alt}
                />
              )}
            </Box>
          )}

          {(showInfoNotification || !item.web_url) && (
            <Box
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                ...overlayAlertSx,
              }}
            >
              {showInfoNotification && (
                <Alert
                  severity="info"
                  onClose={(e) => {
                    e.stopPropagation();
                    mutate(notification);
                  }}
                >
                  {notification.message}
                </Alert>
              )}
              {!item.web_url && (
                <Alert severity="warning">No url has been specified.</Alert>
              )}
            </Box>
          )}
        </Box>
      </CardActionArea>
      <CardActions disableSpacing sx={{ color: 'primary.main', flexShrink: 0, mt: 'auto' }}>
        <PlayButton player={player} id={item.id} disabled={!item.web_url} />
        <CommentButton item={item} saveWatchable={saveWatchable}></CommentButton>
        <IconButton
          id="basic-button"
          color="primary"
          aria-controls={open ? 'basic-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
        >
          <MenuIcon />
        </IconButton>
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
    </Card>
  );
}
export default WatchlistItem;
