import { useState, Fragment, useContext } from 'react';
import { Fab, Drawer, Stack, Box } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import ArrowCircleLeftIcon from '@mui/icons-material/ArrowCircleLeft';
import ArrowCircleRightIcon from '@mui/icons-material/ArrowCircleRight';
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import AdjustIcon from '@mui/icons-material/Adjust';
import HomeIcon from '@mui/icons-material/Home';
import MessageContext from './context/MessageContext.js';
import Api from './service/api.js'

function RemoteControl({ player }) {
    const messageContext = useContext(MessageContext);
    const api = new Api(messageContext);

    const anchor = "remoteOpen";
    const [state, setState] = useState({ remoteOpen: false });
    const toggleDrawer = (anchor, open) => (event) => {
        console.log("toggleDrawer", anchor, open);
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }

        setState({ ...state, [anchor]: open });
    };

    const pushButtonAction = async (button) => {
        await api.pushButton(player, button);
    };

    if (player !== "googletv") {
        return;
    }

    return (
        <Fragment key={anchor}>
                <Fab onClick={toggleDrawer(anchor, true)} sx={{marginBottom: '10px', marginRight: '10px' }}><SettingsRemoteIcon></SettingsRemoteIcon></Fab>
                <Drawer
                    anchor='bottom'
                    open={state[anchor]}
                    onClose={toggleDrawer(anchor, false)}
                >
                    <Stack direction="row" spacing={2} sx={{margin: 'auto'}}>
                        <Stack direction="column" spacing={2}>
                            <Fab variant="extended" onClick={() => false} sx={{visibility: 'hidden'}}>
                            </Fab>
                            <Fab variant="extended" onClick={() => pushButtonAction("left")}>
                                <ArrowCircleLeftIcon />
                            </Fab>
                            <Fab variant="extended" onClick={() => pushButtonAction("back")}>
                                <ArrowBackIcon />
                            </Fab>
                        </Stack>
                        <Stack direction="column" spacing={2}>
                        <Fab variant="extended" onClick={() => pushButtonAction("up")}>
                                <ArrowCircleUpIcon />
                            </Fab>
                            <Fab variant="extended" onClick={() => pushButtonAction("enter")}>
                                <AdjustIcon />
                            </Fab>
                            <Fab variant="extended" onClick={() => pushButtonAction("down")}>
                                <ArrowCircleDownIcon />
                            </Fab>
                        </Stack>
                        <Stack direction="column" spacing={2}>
                            <Fab variant="extended" onClick={() => false} sx={{visibility: 'hidden'}}>
                            </Fab>
                            <Fab variant="extended" onClick={() => pushButtonAction("right")}>
                                <ArrowCircleRightIcon />
                            </Fab>
                            <Fab variant="extended" onClick={() => pushButtonAction("home")}>
                                <HomeIcon />
                            </Fab>
                        </Stack>
                    </Stack>
                </Drawer>
        </Fragment>
    );
}

export default RemoteControl;