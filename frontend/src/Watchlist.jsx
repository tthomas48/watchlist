import { useContext } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import {
  Box, Button, Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';
import WatchlistItem from './WatchlistItem';
import RemoteControl from './RemoteControl';
import {
  hasActiveBrowseFilters,
  browseFiltersToQuery,
  groupByGenre,
  formatGenreLabel,
  clearBrowseFacets,
} from './browseFilters';

function showItem(item, player, saveWatchableMutation, notifications, list) {
  return (
    <Grid size={{ xs: 6, md: 3 }} key={`${item.id}.wrapper`} sx={{ display: 'flex', alignItems: 'stretch' }}>
      <WatchlistItem key={item.id} item={item} player={player}
        saveWatchable={saveWatchableMutation.mutate}
        notifications={notifications}
        list={list} />
    </Grid>
  );
}

function WatchlistGrid({
  items, player, saveWatchableMutation, notifications, list,
}) {
  return (
    <Grid container spacing={2}>
      {items.map((item) => showItem(
        item,
        player,
        saveWatchableMutation,
        notifications,
        list,
      ))}
    </Grid>
  );
}

function Watchlist() {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const queryClient = useQueryClient();
  const {
    list, player, showHidden, sort, browseFilters, setBrowseFilters,
  } = useOutletContext();

  const filterQuery = browseFiltersToQuery(browseFilters);
  const {
    data, isLoading, isError, error,
  } = useQuery({
    queryKey: ['watchlist', list, sort, showHidden, filterQuery],
    queryFn: async () => api.getWatchlist(list, sort, showHidden, filterQuery),
  });

  const notificationsRequest = useQuery({
    queryKey: ['notifications', list],
    queryFn: async () => api.getNotifications(list),
  });

  const saveWatchableMutation = useMutation({
    mutationFn: async (watchable) => {
      try {
        const updated = await api.saveWatchable(watchable.id, watchable);
        queryClient.setQueryData(['watchlist', { id: watchable.id }], updated);
        return true;
      } catch (e) {
        messageContext.sendMessage({
          message: e,
          severity: 'error',
          open: true,
        });
      }
      return false;
    },
  });

  const items = data || [];
  const filtersActive = hasActiveBrowseFilters(browseFilters);
  const useShelves = browseFilters?.viewMode === 'shelves' && !filtersActive;
  const shelves = useShelves ? groupByGenre(items) : null;

  const clearFilters = () => {
    setBrowseFilters(clearBrowseFacets(browseFilters));
  };

  return (
    <div>
      <div className="provider-container">
        <div>
          {isLoading && <div>Loading...</div>}
          {notificationsRequest.isLoading && <div>Loading...</div>}
          {isError && <div>Error: {error.message}</div>}
          {!isLoading && !isError && items.length === 0 && (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                No titles match
              </Typography>
              {filtersActive && (
                <Button onClick={clearFilters}>Clear filters</Button>
              )}
            </Box>
          )}
          {!isLoading && !isError && items.length > 0 && useShelves && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {shelves.map((shelf) => (
                <Box key={shelf.genre}>
                  <Typography variant="h6" sx={{ mb: 1, px: 0.5 }}>
                    {formatGenreLabel(shelf.genre)}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 2,
                      overflowX: 'auto',
                      pb: 1,
                      px: 0.5,
                    }}
                  >
                    {shelf.items.map((item) => (
                      <Box
                        key={`${shelf.genre}-${item.id}`}
                        sx={{
                          flex: '0 0 auto',
                          width: { xs: '42%', sm: '28%', md: '18%' },
                          maxWidth: 220,
                        }}
                      >
                        <WatchlistItem
                          item={item}
                          player={player}
                          saveWatchable={saveWatchableMutation.mutate}
                          notifications={notificationsRequest.data}
                          list={list}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {!isLoading && !isError && items.length > 0 && !useShelves && (
            <WatchlistGrid
              items={items}
              player={player}
              saveWatchableMutation={saveWatchableMutation}
              notifications={notificationsRequest.data}
              list={list}
            />
          )}
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
