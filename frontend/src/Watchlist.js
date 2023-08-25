import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useOutletContext } from "react-router-dom";
import { getWatchlist, saveWatchable } from './api';
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
            <WatchlistItem item={item} player={player} saveWatchable={saveWatchableMutation.mutate}/>
        </Grid>
    );
}

function Watchlist() {
    // Queries
    const queryClient = useQueryClient()
    const [list, player, showHidden] = useOutletContext();
    const { data, isLoading, isError, error } = useQuery({ queryKey: ['watchlist', list], queryFn: () => getWatchlist(list) });
    const saveWatchableMutation = useMutation({
        mutationFn: async (watchable) => {
            try {
                const updated = await saveWatchable(watchable.id, watchable);
                queryClient.setQueryData(['watchlist', { id: watchable.id }], updated)
                return true;
            } catch(e) {
                console.error(e);
            }
            return false;
        },
      });

    return (
        <div>
            <div className="provider-container">
                <h2>To Watch</h2>
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
