import { useState } from 'react';
import { Alert, CardHeader, Card, CardContent, CardMedia, CardActions, Button, Menu, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PlayButton from './PlayButton';
import EditButton from './EditButton';
import ViewOnTraktButton from './ViewOnTraktButton';
import HideButton from './HideButton';
import CommentButton from './CommentButton';

function WatchlistItem({ item, player, saveWatchable }) {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    const missingUrlWarning = (item) => {
        console.log(item);
        if (!item.urls) {
            return (<CardContent><Alert severity="warning">No url has been specified.</Alert></CardContent>);
        }
        let web_url = '';
        item.urls.forEach((url) => {
            // provider_id = url.provider_id;
            if (url.service_type === 'web') {
                web_url = url.url;
            }
        });
        if (web_url) {
            return;
        }
        return (<CardContent><Alert severity="warning">No url has been specified.</Alert></CardContent>);
    };
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    return (<Card key={item.title} sx={{
        backgroundColor: '#278056',
    }}>
        <CardHeader title={item.title} sx={{
            fontSize: '1.0rem',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
        }}></CardHeader>

        <CardMedia component="img" image={`/api/img/${item.id}`} alt={item.title}/>
        {missingUrlWarning(item)}
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
                <MenuItem onClick={handleClose}><ViewOnTraktButton disabled={item.local} traktId={item.trakt_id} mediaType={item.media_type}></ViewOnTraktButton></MenuItem>
                <MenuItem onClick={handleClose}><HideButton item={item} saveWatchable={saveWatchable}></HideButton></MenuItem>
            </Menu>
        </CardActions>
    </Card>);
}
export default WatchlistItem;