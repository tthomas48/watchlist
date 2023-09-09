import { useState } from 'react';
import { CardHeader, Card, CardMedia, CardActions, Button, Menu, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PlayButton from './PlayButton';
import EditButton from './EditButton';
import HideButton from './HideButton';
import CommentButton from './CommentButton';

function WatchlistItem({ item, player, saveWatchable }) {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
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

        <CardMedia component="img" image={item.image} alt={item.title}/>
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
                <MenuItem onClick={handleClose}><HideButton item={item} saveWatchable={saveWatchable}></HideButton></MenuItem>
            </Menu>
        </CardActions>
    </Card>);
}
export default WatchlistItem;