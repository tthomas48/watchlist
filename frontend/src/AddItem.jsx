import {
  useState, useContext, useEffect, useMemo,
} from 'react';
import { Link } from 'react-router-dom';
import { styled, alpha } from '@mui/material/styles';
import {
  Button, Menu, MenuItem, Dialog, DialogTitle, DialogContent, TextField, DialogActions,
  List, ListItemButton, ListItemAvatar, Typography, Box, CircularProgress,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';
import { getTraktId, getTitle, getTraktIds } from './traktDisplay';

function streamingAvailabilityLines(data) {
  if (!data?.ok || !data.show?.streamingOptions) {
    return [];
  }
  const lines = [];
  Object.values(data.show.streamingOptions).forEach((arr) => {
    if (!Array.isArray(arr)) {
      return;
    }
    arr.forEach((o) => {
      const name = o.service?.name || o.service?.id || 'Service';
      const typ = o.type || '';
      lines.push(`${name}${typ ? ` (${typ})` : ''}`);
    });
  });
  return [...new Set(lines)].slice(0, 12);
}

function StreamingAvailabilityBlock({
  query, streamMode, onStreamModeChange, providerPick, onProviderPick,
}) {
  const modeToggle = (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      value={streamMode}
      onChange={(_, v) => {
        if (v != null) {
          onStreamModeChange(v);
          onProviderPick(null);
        }
      }}
      sx={{ mt: 2, mb: 1 }}
    >
      <ToggleButton value="subscription">Subscription</ToggleButton>
      <ToggleButton value="rent">Rent</ToggleButton>
    </ToggleButtonGroup>
  );

  if (!query.isFetched && !query.isFetching) {
    return null;
  }
  if (query.isFetching) {
    return (
      <Box sx={{ mt: 2 }}>
        {modeToggle}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="caption" color="text.secondary">Streaming availability…</Typography>
        </Box>
      </Box>
    );
  }
  if (query.isError) {
    return (
      <Box sx={{ mt: 2 }}>
        {modeToggle}
        <Typography variant="caption" color="error" sx={{ display: 'block' }}>
          {query.error?.message || 'Streaming lookup failed'}
        </Typography>
      </Box>
    );
  }
  const d = query.data;
  if (!d?.ok) {
    let msg = 'No streaming data.';
    if (d?.reason === 'not_configured') {
      msg = 'Streaming availability is not configured on the server.';
    } else if (d?.reason === 'not_found') {
      msg = 'Not found in streaming catalog.';
    } else if (d?.reason === 'missing_ids') {
      msg = 'No IMDB/TMDB id on this row for lookup.';
    }
    return (
      <Box sx={{ mt: 2 }}>
        {modeToggle}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {msg}
        </Typography>
      </Box>
    );
  }

  if (d.subscriptionProfileEmpty && streamMode === 'subscription') {
    return (
      <Box sx={{ mt: 2 }}>
        {modeToggle}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Configure which services you use to see matching links here.
        </Typography>
        <Button variant="outlined" size="small" component={Link} to="/streaming-access">
          Streaming access settings
        </Button>
      </Box>
    );
  }

  const lines = streamingAvailabilityLines(d);
  const matchedProviders = Array.isArray(d?.matchedProviders) ? d.matchedProviders : [];
  const selectValue = providerPick
    ? JSON.stringify({
      link: providerPick.link,
      serviceId: providerPick.serviceId ?? null,
      addonId: providerPick.addonId ?? null,
    })
    : '';

  if (!lines.length) {
    return (
      <Box sx={{ mt: 2 }}>
        {modeToggle}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          No known streaming options for this region (third-party data; may be incomplete).
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ mt: 2 }}>
      {modeToggle}
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
        Where to stream (informational; third-party)
      </Typography>
      <Typography variant="body2" component="div" sx={{ color: 'text.primary' }}>
        {lines.join(' · ')}
      </Typography>
      {matchedProviders.length > 0 && (
        <TextField
          select
          fullWidth
          size="small"
          label="Choose provider link"
          value={selectValue}
          onChange={(e) => {
            const { value } = e.target;
            if (!value) {
              onProviderPick(null);
              return;
            }
            try {
              const o = JSON.parse(value);
              onProviderPick({
                link: o.link,
                serviceId: o.serviceId,
                addonId: o.addonId,
              });
            } catch {
              onProviderPick(null);
            }
          }}
          sx={{
            mt: 1,
            '& .MuiInputBase-input': { color: 'text.secondary' },
            '& .MuiInputLabel-root': { color: 'text.secondary' },
          }}
        >
          <MenuItem value="" sx={{ color: 'text.secondary' }}>
            No provider URL
          </MenuItem>
          {matchedProviders.map((m) => {
            const label = `${m.serviceName || 'Service'}${m.addonName ? ` via ${m.addonName}` : ''}${m.type ? ` (${m.type})` : ''}`;
            const key = `${m.link}|${m.serviceId || ''}|${m.addonId || ''}|${m.type || ''}|${m.country || ''}`;
            const optVal = JSON.stringify({
              link: m.link,
              serviceId: m.serviceId,
              addonId: m.addonId,
            });
            return (
              <MenuItem key={key} value={optVal} sx={{ color: 'text.secondary' }}>
                {label}
              </MenuItem>
            );
          })}
        </TextField>
      )}
    </Box>
  );
}

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
    minWidth: 200,
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

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function traktPosterSrc(row) {
  const id = getTraktId(row);
  const t = row?.type;
  if (!id || (t !== 'movie' && t !== 'show')) {
    return null;
  }
  return `/api/img/trakt/${encodeURIComponent(t)}/${encodeURIComponent(id)}`;
}

function rowYear(row) {
  const inner = row?.[row.type];
  if (inner?.year != null) {
    return String(inner.year);
  }
  return '';
}

const AddItem = ({ list }) => {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const queryClient = useQueryClient();
  const { register, getValues } = useForm();
  const [anchorEl, setAnchorEl] = useState(null);
  const [localDialogOpen, setLocalDialogOpen] = useState(false);
  const [traktDialogOpen, setTraktDialogOpen] = useState(false);
  const [searchScope, setSearchScope] = useState('movie,show');
  const [searchQuery, setSearchQuery] = useState('');
  const [pickedRow, setPickedRow] = useState(null);
  const [streamMode, setStreamMode] = useState('subscription');
  const [providerPick, setProviderPick] = useState(null);
  const debouncedSearch = useDebounced(searchQuery, 800);
  const open = Boolean(anchorEl);
  const listReady = Boolean(list?.user?.username && list?.ids?.trakt != null);

  const capabilitiesQuery = useQuery({
    queryKey: ['capabilities'],
    queryFn: () => api.getCapabilities(),
    staleTime: 5 * 60 * 1000,
    enabled: listReady,
  });
  const streamingEnabled = capabilitiesQuery.data?.streamingEnabled === true;

  const streamParams = useMemo(() => {
    if (!traktDialogOpen || !streamingEnabled || !pickedRow) {
      return null;
    }
    const type = pickedRow.type;
    if (type !== 'movie' && type !== 'show') {
      return null;
    }
    const ids = getTraktIds(pickedRow);
    const imdbId = ids?.imdb ?? null;
    const tmdbId = ids?.tmdb ?? null;
    if (!imdbId && (tmdbId == null || String(tmdbId).trim() === '')) {
      return null;
    }
    return { type, imdbId, tmdbId };
  }, [traktDialogOpen, pickedRow, streamingEnabled]);

  const streamingQuery = useQuery({
    queryKey: ['streaming-availability', 'trakt-add', streamParams, streamMode],
    queryFn: () => api.getStreamingAvailability({ ...streamParams, mode: streamMode }),
    enabled: Boolean(streamParams),
  });

  const handleClose = () => {
    setAnchorEl(null);
  };

  const addTraktWebsite = async () => {
    handleClose();
    window.open('https://trakt.tv/search', '_watchlist', 'noreferrer');
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const openTraktDialog = () => {
    setTraktDialogOpen(true);
    setSearchQuery('');
    setSearchScope('movie,show');
    setPickedRow(null);
    setStreamMode('subscription');
    setProviderPick(null);
    handleClose();
  };

  const traktSearchQuery = useQuery({
    queryKey: ['trakt-search', debouncedSearch, searchScope],
    queryFn: () => api.traktSearch(debouncedSearch, searchScope),
    enabled: traktDialogOpen && debouncedSearch.trim().length >= 2,
  });

  const addTraktMutation = useMutation({
    mutationFn: async () => {
      if (!pickedRow) {
        throw new Error('Select a title');
      }
      const id = getTraktId(pickedRow);
      const type = pickedRow.type;
      if (!id || (type !== 'show' && type !== 'movie')) {
        throw new Error('Invalid selection');
      }
      const addRes = await api.traktAddToList(list, type, id);
      const rows = Array.isArray(addRes?.watchables) ? addRes.watchables : [];
      const added = rows.find((w) => String(w.trakt_id) === String(id)
        && w.media_type === type);
      if (added?.id) {
        await api.saveWatchable(added.id, {
          hidden: added.hidden,
          comment: added.comment,
          noautoadvance: added.noautoadvance,
          webUrl: providerPick?.link ?? '',
          streamingServiceId: providerPick?.serviceId ?? null,
          streamingAddonId: providerPick?.addonId ?? null,
        });
      }
      return addRes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      setTraktDialogOpen(false);
      setSearchQuery('');
      setPickedRow(null);
      setProviderPick(null);
      handleClose();
    },
  });

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
      setLocalDialogOpen(false);
      handleClose();
    },
  });

  const localDialog = (
    <Dialog open={localDialogOpen} onClose={() => setLocalDialogOpen(false)}>
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
        <Button onClick={() => setLocalDialogOpen(false)}>Close</Button>
        <Button onClick={() => createMutation.mutate()}>Save</Button>
      </DialogActions>
    </Dialog>
  );

  const traktDialog = (
    <Dialog
      open={traktDialogOpen}
      onClose={() => setTraktDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Add title</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Choose movies, TV shows, or both, then search Trakt.
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={searchScope}
          onChange={(_, v) => {
            if (v != null) {
              setSearchScope(v);
              setPickedRow(null);
              setProviderPick(null);
            }
          }}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="movie">Movie</ToggleButton>
          <ToggleButton value="show">TV show</ToggleButton>
          <ToggleButton value="movie,show">Both</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          fullWidth
          label="Search"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPickedRow(null);
            setProviderPick(null);
          }}
          sx={{ mb: 2 }}
        />
        {traktSearchQuery.isFetching && <CircularProgress size={28} sx={{ mb: 1 }} />}
        {traktSearchQuery.isError && (
          <Typography color="error" variant="body2">{traktSearchQuery.error?.message}</Typography>
        )}
        <List dense sx={{ maxHeight: 360, overflow: 'auto' }}>
          {(traktSearchQuery.data?.results || []).map((row) => {
            const id = getTraktId(row);
            const title = getTitle(row) || '(no title)';
            const key = `${row.type}-${id}`;
            const selected = pickedRow
              && pickedRow.type === row.type
              && getTraktId(pickedRow) === id;
            const poster = traktPosterSrc(row);
            const year = rowYear(row);
            return (
              <ListItemButton
                key={key}
                selected={Boolean(selected)}
                onClick={() => {
                  setPickedRow(row);
                  setProviderPick(null);
                }}
              >
                <ListItemAvatar sx={{ minWidth: 56 }}>
                  {poster ? (
                    <Box
                      component="img"
                      src={poster}
                      alt=""
                      sx={{ width: 40, height: 60, objectFit: 'cover', borderRadius: 0.5 }}
                    />
                  ) : (
                    <Box sx={{ width: 40, height: 60, bgcolor: 'action.hover', borderRadius: 0.5 }} />
                  )}
                </ListItemAvatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body1" sx={{ lineHeight: 1.2 }} color="text.secondary">
                    {title}
                    {row.type ? ` (${row.type})` : ''}
                  </Typography>
                  {year ? (
                    <Typography variant="body2" color="text.secondary">{year}</Typography>
                  ) : null}
                </Box>
              </ListItemButton>
            );
          })}
        </List>
        {streamingEnabled && streamParams && (
          <StreamingAvailabilityBlock
            query={streamingQuery}
            streamMode={streamMode}
            onStreamModeChange={setStreamMode}
            providerPick={providerPick}
            onProviderPick={setProviderPick}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setTraktDialogOpen(false)}>Close</Button>
        <Button
          variant="contained"
          disabled={!pickedRow || addTraktMutation.isPending}
          onClick={() => addTraktMutation.mutate()}
        >
          Add to list
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <div>
      <Button
        variant="outlined"
        onClick={handleClick}
        disabled={!listReady}
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
        <MenuItem
          onClick={openTraktDialog}
          disabled={!listReady}
          disableRipple
        >
          <SearchIcon />
          Add title
        </MenuItem>
        <MenuItem onClick={addTraktWebsite} disableRipple>
          <OpenInNewIcon />
          Open Trakt search
        </MenuItem>
        <MenuItem
          onClick={() => { setLocalDialogOpen(true); handleClose(); }}
          disabled={!listReady}
          disableRipple
        >
          <AddCircleIcon />
          Add local only
        </MenuItem>
      </StyledMenu>
      {localDialog}
      {traktDialog}
    </div>
  );
};
export default AddItem;
