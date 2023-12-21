import { useContext } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useOutletContext } from "react-router-dom";
import { MessageContext } from './context/MessageContext.js';
import Api from './service/api.js'
import { Box } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import WatchlistItem from './WatchlistItem';
import RemoteControl from './RemoteControl';

function showItem(item, player, saveWatchableMutation, showHidden) {
    if (!showHidden && item.hidden) {
        return;
    }
    return (
        <Grid xs={6} md={3}>
            <WatchlistItem item={item} player={player} saveWatchable={saveWatchableMutation.mutate} />
        </Grid>
    );
}

function Watchlist() {
    const messageContext = useContext(MessageContext);
    const api = new Api(messageContext);
    // Queries
    const queryClient = useQueryClient()
    const [list, player, showHidden, sort] = useOutletContext();
    const { data, isLoading, isError, error } = useQuery({ queryKey: ['watchlist', list, sort], queryFn: async () => await api.getWatchlist(list, sort) });
    const saveWatchableMutation = useMutation({
        mutationFn: async (watchable) => {
            try {
                const updated = await api.saveWatchable(watchable.id, watchable);
                queryClient.setQueryData(['watchlist', { id: watchable.id }], updated)
                return true;
            } catch (e) {
                console.error(e);
            }
            return false;
        },
    });

    return (
        <div>
            <div className="provider-container">
                <div>
                    {isLoading && <div>Loading...</div>}
                    {isError && <div>Error: {error.message}</div>}
                    <Grid container spacing={2}>
                        {data?.map((item) => showItem(item, player, saveWatchableMutation, showHidden))}
                    </Grid>
                </div>
            </div>
            <Box id="remote-control" sx={{
                position: 'fixed',
                bottom: '0px',
                right: '0px',
            }}>
                <RemoteControl player={player} />
            </Box>
        </div>
    );
}
export default Watchlist;
