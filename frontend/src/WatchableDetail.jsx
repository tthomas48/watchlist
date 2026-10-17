import { useContext, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import LiveTv from '@mui/icons-material/LiveTv';
import Refresh from '@mui/icons-material/Refresh';
import PlayButton from './PlayButton';
import TrailerButton from './TrailerButton';
import getStreamingServiceIcon from './streamingServiceIcon';
import { formatGenreLabel, MOOD_OPTIONS } from './browseFilters';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';
import PersonAvatar from './PersonAvatar';

const OVERVIEW_COLLAPSED_LINES = 4;

function formatCheckedAt(iso) {
  if (!iso) {
    return null;
  }
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function StreamingOptionList({ options, emptyLabel }) {
  if (!options.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {emptyLabel}
      </Typography>
    );
  }
  return (
    <List dense disablePadding sx={{ mb: 1 }}>
      {options.map((opt) => (
        <ListItem
          key={`${opt.serviceId}-${opt.addonId || ''}-${opt.link}`}
          disableGutters
          secondaryAction={opt.link ? (
            <Button
              size="small"
              component="a"
              href={opt.link}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </Button>
          ) : null}
        >
          <ListItemText
            primary={opt.serviceName || opt.serviceId || 'Service'}
            secondary={opt.type}
          />
        </ListItem>
      ))}
    </List>
  );
}

export function WatchableDetailContent({
  item,
  player,
  onEdit,
  onClose,
  onItemUpdated,
}) {
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [rentals, setRentals] = useState(null);
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const queryClient = useQueryClient();
  const moodsQuery = useQuery({
    queryKey: ['moods'],
    queryFn: async () => api.getMoods(),
    staleTime: 60_000,
  });
  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: async () => api.getGenres(),
    staleTime: 60_000,
  });
  const serviceIcon = getStreamingServiceIcon(item.streaming_service_id);
  const hasOverview = Boolean(item.overview);
  const genres = Array.isArray(item.genres) ? item.genres : [];
  const moods = Array.isArray(item.moods) ? item.moods : [];
  const recommenders = Array.isArray(item.recommenders) ? item.recommenders : [];
  const streaming = item.streaming || {
    checkedAt: null,
    stale: true,
    subscription: [],
    other: [],
  };
  const subscription = Array.isArray(streaming.subscription) ? streaming.subscription : [];
  const other = Array.isArray(streaming.other) ? streaming.other : [];

  const moodLabel = (id) => (
    moodsQuery.data?.moods?.find((m) => m.slug === id)?.label
    || MOOD_OPTIONS.find((m) => m.id === id)?.label
    || formatGenreLabel(id)
  );
  const genreLabel = (slug) => (
    genresQuery.data?.find((g) => g.slug === slug)?.label
    || formatGenreLabel(slug)
  );

  const refreshStreamingMutation = useMutation({
    mutationFn: () => api.refreshWatchableStreaming(item.id),
    onSuccess: (data) => {
      if (typeof onItemUpdated === 'function') {
        onItemUpdated({
          ...item,
          ...(data?.streaming ? { streaming: data.streaming } : {}),
          ...(Object.prototype.hasOwnProperty.call(data || {}, 'web_url')
            ? { web_url: data.web_url } : {}),
          ...(Object.prototype.hasOwnProperty.call(data || {}, 'streaming_service_id')
            ? { streaming_service_id: data.streaming_service_id } : {}),
          ...(Object.prototype.hasOwnProperty.call(data || {}, 'streaming_addon_id')
            ? { streaming_addon_id: data.streaming_addon_id } : {}),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const rentalsMutation = useMutation({
    mutationFn: () => api.getWatchableRentals(item.id),
    onSuccess: (data) => {
      setRentals(Array.isArray(data?.options) ? data.options : []);
    },
  });

  useEffect(() => {
    setRentals(null);
    rentalsMutation.mutate();
    // Auto-load rentals once per watchable open; intentional mount/id trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  return (
    <>
      <DialogTitle id="watchable-detail-dialog-title">
        {item.title}
        {item.year != null && (
          <Typography component="span" variant="subtitle1" color="text.secondary" sx={{ ml: 1 }}>
            {item.year}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'center', sm: 'flex-start' }}
        >
          <Box
            component="img"
            src={`/api/img/${item.id}`}
            alt={item.title}
            sx={{
              width: { xs: 160, sm: 180 },
              maxWidth: '100%',
              aspectRatio: '2 / 3',
              objectFit: 'contain',
              bgcolor: '#000',
              borderRadius: 1,
              flexShrink: 0,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            {serviceIcon && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                {serviceIcon.type === 'img' ? (
                  <Box
                    component="img"
                    src={serviceIcon.src}
                    alt=""
                    sx={{ width: 28, height: 28, objectFit: 'contain' }}
                  />
                ) : (
                  <LiveTv sx={{ width: 28, height: 28 }} titleAccess={serviceIcon.alt} />
                )}
                <Typography variant="body2" color="text.secondary">
                  {serviceIcon.alt}
                </Typography>
              </Stack>
            )}
            {recommenders.length > 0 && (
              <Stack spacing={1} sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Recommended by
                </Typography>
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} alignItems="center">
                  {recommenders.map((person) => (
                    <Stack key={person.id} direction="row" spacing={0.75} alignItems="center">
                      <PersonAvatar person={person} size={28} />
                      <Typography variant="body2">{person.name}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            )}
            {(genres.length > 0 || moods.length > 0) && (
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mb: 1.5 }}>
                {genres.map((g) => (
                  <Chip key={`g-${g}`} size="small" label={genreLabel(g)} variant="outlined" />
                ))}
                {moods.map((m) => (
                  <Chip key={`m-${m}`} size="small" label={moodLabel(m)} color="primary" variant="outlined" />
                ))}
              </Stack>
            )}
            {hasOverview && (
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={overviewExpanded ? undefined : {
                    display: '-webkit-box',
                    WebkitLineClamp: OVERVIEW_COLLAPSED_LINES,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.overview}
                </Typography>
                <Button
                  size="small"
                  onClick={() => setOverviewExpanded((v) => !v)}
                  sx={{ mt: 0.5, px: 0, minWidth: 0 }}
                >
                  {overviewExpanded ? 'Less' : 'More'}
                </Button>
              </Box>
            )}
            {item.rogerebert_url && (
              <Link
                href={item.rogerebert_url}
                target="_blank"
                rel="noreferrer"
                sx={{ display: 'inline-block', mb: 1.5 }}
              >
                Roger Ebert review
              </Link>
            )}

            <Box sx={{ mt: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2">Where to watch</Typography>
                <Button
                  size="small"
                  startIcon={<Refresh />}
                  disabled={refreshStreamingMutation.isPending}
                  onClick={() => refreshStreamingMutation.mutate()}
                >
                  Refresh
                </Button>
              </Stack>
              {formatCheckedAt(streaming.checkedAt) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  As of {formatCheckedAt(streaming.checkedAt)}
                  {streaming.stale ? ' (stale)' : ''}
                </Typography>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                On your plan
              </Typography>
              <StreamingOptionList
                options={subscription}
                emptyLabel={streaming.checkedAt
                  ? 'No matching subscription options for your profile.'
                  : 'Streaming availability has not been checked yet.'}
              />

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                Also available
              </Typography>
              <StreamingOptionList
                options={other}
                emptyLabel={streaming.checkedAt
                  ? 'No other subscription services found.'
                  : 'Not checked yet.'}
              />

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, mt: 0.5 }}>
                Rent / buy
              </Typography>
              {rentalsMutation.isPending && rentals == null && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Loading rentals…
                </Typography>
              )}
              {rentalsMutation.isError && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                  {rentalsMutation.error?.message || 'Could not load rentals'}
                </Typography>
              )}
              {Array.isArray(rentals) && (
                rentals.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    No rent/buy options found.
                  </Typography>
                ) : (
                  <List dense disablePadding sx={{ mb: 1 }}>
                    {rentals.map((opt) => (
                      <ListItem
                        key={`${opt.serviceId}-${opt.type}-${opt.link}`}
                        disableGutters
                        secondaryAction={opt.link ? (
                          <Button
                            size="small"
                            component="a"
                            href={opt.link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </Button>
                        ) : null}
                      >
                        <ListItemText
                          primary={`${opt.serviceName || opt.serviceId || 'Store'} · ${opt.type}`}
                          secondary={opt.price?.formatted || opt.price?.amount || null}
                        />
                      </ListItem>
                    ))}
                  </List>
                )
              )}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
        <PlayButton player={player} id={item.id} disabled={!item.web_url} />
        <TrailerButton
          id={item.id}
          trailerUrl={item.trailer_url}
          title={item.title}
        />
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Edit />}
          onClick={onEdit}
        >
          Edit
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </>
  );
}

export default WatchableDetailContent;
