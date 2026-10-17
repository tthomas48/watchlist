import { useState, useContext, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Typography, Button, TextField, Stack, FormControl, Checkbox,
  FormHelperText, IconButton, ListItemText,
  Tabs, Box, Tab, List, ListItem, ListItemButton, ListItemIcon,
  FormControlLabel, DialogTitle, DialogContent, CircularProgress,
  Autocomplete, Chip, createFilterOptions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';
import PeopleMultiSelect from './PeopleMultiSelect';

const genreFilter = createFilterOptions();

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

function canDeleteWatchable(item) {
  if (!item) {
    return false;
  }
  if (item.local) {
    return true;
  }
  return Boolean(
    item.trakt_list_id
    && item.trakt_id
    && (item.media_type === 'movie' || item.media_type === 'show'),
  );
}

function CustomTabPanel(props) {
  const {
    children, value, index, ...other
  } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

export function WatchableEditor({ id, onClose }) {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);

  const [tabIndex, setTabIndex] = useState(0);
  const [checked, setChecked] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const queryClient = useQueryClient();
  const {
    register, handleSubmit, getValues, setValue,
  } = useForm();

  useEffect(() => {
    setTabIndex(0);
    setChecked([]);
    setSelectedGenres([]);
    setSelectedPeople([]);
  }, [id]);

  const { mutate } = useMutation({
    mutationFn: async (watchable) => {
      try {
        await api.saveWatchable(id, {
          ...watchable,
          genres: selectedGenres.map((g) => g.slug || g),
          personIds: selectedPeople.map((p) => p.id),
        });
        queryClient.invalidateQueries({ queryKey: ['watchable', id] });
        queryClient.invalidateQueries({ queryKey: ['watchlist'] });
        queryClient.invalidateQueries({ queryKey: ['genres'] });
        queryClient.invalidateQueries({ queryKey: ['people'] });
        onClose();
        return true;
      } catch (e) {
        messageContext.sendMessage({
          message: e.message,
          severity: 'error',
          open: true,
        });
      }
      return false;
    },
  });

  const {
    data, isLoading,
  } = useQuery({
    queryKey: ['watchable', id],
    queryFn: async () => api.getWatchable(id),
    staleTime: Infinity, // do not refresh data
  });

  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: async () => api.getGenres(),
    staleTime: 60_000,
  });

  // Seed selection from the watchable only (not when the genre catalog refetches —
  // otherwise creating a genre resets chips back to the last saved list).
  useEffect(() => {
    if (!data?.watchable) return;
    const slugs = Array.isArray(data.watchable.genres) ? data.watchable.genres : [];
    const catalog = genresQuery.data || [];
    setSelectedGenres(slugs.map((slug) => {
      const found = catalog.find((g) => g.slug === slug);
      return found || { slug, label: slug };
    }));
    const recommenders = Array.isArray(data.watchable.recommenders)
      ? data.watchable.recommenders
      : [];
    setSelectedPeople(recommenders.map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatar_url || p.avatarUrl || null,
    })));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit genresQuery.data
  }, [data?.watchable]);

  // Enrich chip labels when catalog loads/updates without dropping local selections
  useEffect(() => {
    const catalog = genresQuery.data;
    if (!catalog?.length) return;
    setSelectedGenres((prev) => prev.map((g) => {
      const found = catalog.find((c) => c.slug === g.slug);
      return found || g;
    }));
  }, [genresQuery.data]);

  const episodesQuery = useQuery({
    queryKey: ['episodes', id],
    queryFn: async () => api.getEpisodes(id),
    staleTime: Infinity,
  });

  useEffect(() => {
    const episodes = episodesQuery.data;
    if (!episodes) {
      return;
    }
    const checkedEpisodes = [];
    for (let i = 0; i < episodes.length; i += 1) {
      if (episodes[i].watched) {
        checkedEpisodes.push(episodes[i].id);
      }
    }
    setChecked(checkedEpisodes);
  }, [episodesQuery.data]);

  const visitHomePage = (homepage) => {
    if (homepage) {
      window.open(homepage, '_watchlist', 'noreferrer');
    }
  };

  const doDownload = async (item) => {
    const values = getValues();
    await api.updateImage(item.id, values.image_url);
    queryClient.invalidateQueries({ queryKey: ['watchable', id] });
  };

  const copyDown = async (homepage) => {
    setValue('webUrl', homepage);
  };

  const lookupEbert = async () => {
    try {
      const result = await api.lookupRogerEbert(id);
      if (result?.url) {
        setValue('rogerebertUrl', result.url);
        messageContext.sendMessage({
          message: 'Roger Ebert review found',
          severity: 'success',
          open: true,
        });
      } else {
        messageContext.sendMessage({
          message: 'No Roger Ebert review found',
          severity: 'warning',
          open: true,
        });
      }
    } catch (e) {
      messageContext.sendMessage({
        message: e.message,
        severity: 'error',
        open: true,
      });
    }
  };

  const doDelete = async (item) => {
    try {
      await api.deleteWatchable(item.id);
      queryClient.removeQueries({ queryKey: ['watchable', id] });
      queryClient.removeQueries({ queryKey: ['episodes', id] });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      onClose();
    } catch {
      // Api.handleResponse already surfaced the error
    }
  };

  const setWatched = async (item, watched) => {
    item.watched = !item.watched;
    await api.updateEpisode(item.watchable_id, item.id, watched);
    queryClient.invalidateQueries({ queryKey: ['episodes', id] });
  };

  const handleToggle = (item) => () => {
    const currentIndex = checked.indexOf(item.id);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(item.id);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);

    setWatched(item, checked.indexOf(item.id) === -1);
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  if (isLoading) {
    return (
      <>
        <DialogTitle id="watchable-edit-dialog-title">Edit</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </>
    );
  }

  return (
    <>
      <DialogTitle id="watchable-edit-dialog-title">
        Edit {data.watchable.title}
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          maxHeight: 'min(85vh, 720px)',
          overflow: 'auto',
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabIndex} onChange={handleTabChange} aria-label="watchable edit tabs">
            <Tab label="General" {...a11yProps(0)} />
            {data.watchable.media_type === 'show' && <Tab label="Episodes" {...a11yProps(1)} />}
          </Tabs>
        </Box>
        <CustomTabPanel value={tabIndex} index={0}>
          <form onSubmit={handleSubmit(mutate)}>
            <Stack
              direction="column"
              justifyContent="flex-start"
              alignItems="flex-start"
              spacing={2}
            >
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="flex-start"
                spacing={1}
              >
                <FormControl>
                  <FormHelperText sx={{ overflow: 'hidden', maxWidth: '220px' }}>
                    Open Trakt or your streaming app to find a playable URL, then paste it below.
                  </FormHelperText>
                </FormControl>
                <IconButton aria-label="search trakt" onClick={() => visitHomePage('https://trakt.tv/search')}>
                  <SearchIcon />
                </IconButton>
              </Stack>
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="flex-start"
                spacing={1}
              >
                <TextField
                  label="Home Page"
                  variant="outlined"
                  defaultValue={data.watchable.homepage}
                  InputLabelProps={{ shrink: true, readOnly: true }}
                />
                <IconButton
                  aria-label="copy to web url"
                  onClick={() => copyDown(data.watchable.homepage)}
                >
                  <ContentCopyIcon />
                </IconButton>
                <IconButton
                  aria-label="visit home page"
                  onClick={() => visitHomePage(data.watchable.homepage)}
                >
                  <LinkIcon />
                </IconButton>
              </Stack>
              <TextField
                {...register('webUrl')}
                label="Web URL"
                variant="outlined"
                defaultValue={data.watchable.web_url}
              />
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="flex-start"
                spacing={1}
                sx={{ width: '100%' }}
              >
                <TextField
                  {...register('rogerebertUrl')}
                  label="Roger Ebert URL"
                  variant="outlined"
                  defaultValue={data.watchable.rogerebert_url || ''}
                  sx={{ flexGrow: 1 }}
                />
                <IconButton aria-label="lookup roger ebert review" onClick={lookupEbert}>
                  <ManageSearchIcon />
                </IconButton>
                <IconButton
                  aria-label="open roger ebert review"
                  onClick={() => visitHomePage(getValues('rogerebertUrl') || data.watchable.rogerebert_url)}
                >
                  <LinkIcon />
                </IconButton>
              </Stack>
              <FormControlLabel
                control={(
                  <Checkbox
                    {...register('noautoadvance')}
                    defaultChecked={data.watchable.noautoadvance}
                  />
                )}
                label="Disable Auto Advance"
              />
              <Box sx={{ width: '100%' }}>
                <Autocomplete
                  multiple
                  selectOnFocus
                  clearOnBlur
                  handleHomeEndKeys
                  options={genresQuery.data || []}
                  value={selectedGenres}
                  filterOptions={(options, params) => {
                    const filtered = genreFilter(options, params);
                    const input = params.inputValue.trim();
                    if (!input) return filtered;
                    const exists = options.some(
                      (opt) => (opt.label || opt.slug || '').toLowerCase() === input.toLowerCase(),
                    );
                    if (!exists) {
                      filtered.push({
                        inputValue: input,
                        label: `Add "${input}"`,
                        slug: `__new__${input}`,
                        isNew: true,
                      });
                    }
                    return filtered;
                  }}
                  onChange={async (_e, next) => {
                    const pending = next.filter((g) => g?.isNew);
                    const kept = next.filter((g) => g && !g.isNew);
                    if (!pending.length) {
                      setSelectedGenres(kept);
                      return;
                    }
                    try {
                      const createdList = [];
                      for (const p of pending) {
                        const label = p.inputValue || p.label;
                        // eslint-disable-next-line no-await-in-loop
                        const created = await api.createGenre(label);
                        createdList.push(created);
                      }
                      queryClient.invalidateQueries({ queryKey: ['genres'] });
                      const bySlug = new Map();
                      [...kept, ...createdList].forEach((g) => {
                        if (g?.slug) bySlug.set(g.slug, g);
                      });
                      setSelectedGenres([...bySlug.values()]);
                    } catch (e) {
                      messageContext.sendMessage({
                        message: e.message,
                        severity: 'error',
                        open: true,
                      });
                      setSelectedGenres(kept);
                    }
                  }}
                  getOptionLabel={(opt) => {
                    if (typeof opt === 'string') return opt;
                    if (opt.isNew) return opt.inputValue || '';
                    return opt.label || opt.slug || '';
                  }}
                  isOptionEqualToValue={(a, b) => a.slug === b.slug}
                  renderOption={(props, option) => (
                    <li {...props} key={option.slug}>
                      {option.isNew ? option.label : (option.label || option.slug)}
                    </li>
                  )}
                  renderTags={(value, getTagProps) => value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.slug}
                      size="small"
                      label={option.label || option.slug}
                    />
                  ))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Genres"
                      variant="outlined"
                      placeholder="Search or add…"
                    />
                  )}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Type to search; choose “Add …” if the genre is new. Editing locks tags against Trakt refresh.
                  {data.watchable.genres_locked ? ' (currently locked)' : ''}
                </Typography>
              </Box>
              <Box sx={{ width: '100%' }}>
                <PeopleMultiSelect
                  value={selectedPeople}
                  onChange={setSelectedPeople}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Who recommended this title. Type a new name to add someone quickly.
                </Typography>
              </Box>
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="flex-start"
                spacing={1}
              >
                <FormControl>
                  <TextField
                    {...register('image_url')}
                    label="Image URL"
                    variant="outlined"
                  />
                </FormControl>
                <IconButton aria-label="download" onClick={() => doDownload(data.watchable)}>
                  <DownloadIcon />
                </IconButton>
              </Stack>
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={1}
                sx={{ flexGrow: 1 }}
              >
                <Button variant="outlined" type="submit">Save</Button>
                <Button variant="outlined" onClick={onClose}>Cancel</Button>
                <Button
                  variant="outlined"
                  onClick={() => doDelete(data.watchable)}
                  disabled={!canDeleteWatchable(data.watchable)}
                >
                  Delete
                </Button>
              </Stack>
            </Stack>
          </form>
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={1}>
          {episodesQuery.isLoading && <Typography sx={{ py: 2 }}>Loading…</Typography>}
          <List>
            {episodesQuery.data?.map((item) => (
              <ListItem key={item.id} className="hiddenOverflow">
                <ListItemButton role={undefined} onClick={handleToggle(item)} dense>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={checked.includes(item.id)}
                      tabIndex={-1}
                      disableRipple
                      inputProps={{ 'aria-labelledby': `episode-list-label-${item.id}` }}
                    />
                  </ListItemIcon>
                  <ListItemText id={`episode-list-label-${item.id}`} primary={`[${item.season}:${item.episode}] ${item.title}`} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </CustomTabPanel>
      </DialogContent>
    </>
  );
}
