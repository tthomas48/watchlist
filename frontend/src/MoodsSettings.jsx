import { useContext, useEffect, useMemo, useState } from 'react';
import {
  useQuery,
  useQueryClient,
  useMutation,
} from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  NativeSelect,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function MoodsSettings({ onClose, embedded }) {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const queryClient = useQueryClient();

  const moodsQuery = useQuery({
    queryKey: ['moods'],
    queryFn: async () => api.getMoods(),
  });
  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: async () => api.getGenres(),
  });

  const [moods, setMoods] = useState([]);
  const [mappingsByGenre, setMappingsByGenre] = useState({});
  const [newMoodLabel, setNewMoodLabel] = useState('');
  const [selectedGenreSlug, setSelectedGenreSlug] = useState('');

  useEffect(() => {
    if (!moodsQuery.data) return;
    setMoods((moodsQuery.data.moods || []).map((m) => ({
      slug: m.slug,
      label: m.label,
      sortOrder: m.sortOrder,
    })));
    const next = {};
    for (const row of moodsQuery.data.mappings || []) {
      if (!next[row.genreSlug]) next[row.genreSlug] = [];
      next[row.genreSlug].push(row.moodSlug);
    }
    setMappingsByGenre(next);
  }, [moodsQuery.data]);

  const genreList = useMemo(() => {
    const fromApi = genresQuery.data || [];
    const slugs = new Set(fromApi.map((g) => g.slug));
    Object.keys(mappingsByGenre).forEach((s) => slugs.add(s));
    return [...slugs].sort().map((slug) => {
      const found = fromApi.find((g) => g.slug === slug);
      return found || { slug, label: slug };
    });
  }, [genresQuery.data, mappingsByGenre]);

  useEffect(() => {
    if (!genreList.length) {
      setSelectedGenreSlug('');
      return;
    }
    setSelectedGenreSlug((prev) => (
      genreList.some((g) => g.slug === prev) ? prev : genreList[0].slug
    ));
  }, [genreList]);

  const selectedMappedCount = selectedGenreSlug
    ? (mappingsByGenre[selectedGenreSlug] || []).length
    : 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const mappings = [];
      Object.entries(mappingsByGenre).forEach(([genreSlug, moodSlugs]) => {
        (moodSlugs || []).forEach((moodSlug) => {
          mappings.push({ genreSlug, moodSlug });
        });
      });
      return api.saveMoods({
        moods: moods.map((m, i) => ({
          slug: m.slug,
          label: m.label,
          sortOrder: i,
        })),
        mappings,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moods'] });
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      messageContext.sendMessage({
        message: 'Moods saved',
        severity: 'success',
        open: true,
      });
      if (onClose) onClose();
    },
    onError: (e) => {
      messageContext.sendMessage({
        message: e.message,
        severity: 'error',
        open: true,
      });
    },
  });

  const addMood = () => {
    const label = newMoodLabel.trim();
    const slug = slugify(label);
    if (!slug) return;
    if (moods.some((m) => m.slug === slug)) {
      messageContext.sendMessage({
        message: `Mood "${slug}" already exists`,
        severity: 'warning',
        open: true,
      });
      return;
    }
    setMoods([...moods, { slug, label, sortOrder: moods.length }]);
    setNewMoodLabel('');
  };

  const removeMood = (slug) => {
    setMoods(moods.filter((m) => m.slug !== slug));
    const next = { ...mappingsByGenre };
    Object.keys(next).forEach((genreSlug) => {
      next[genreSlug] = (next[genreSlug] || []).filter((m) => m !== slug);
    });
    setMappingsByGenre(next);
  };

  const toggleMapping = (genreSlug, moodSlug) => {
    const current = mappingsByGenre[genreSlug] || [];
    const has = current.includes(moodSlug);
    setMappingsByGenre({
      ...mappingsByGenre,
      [genreSlug]: has ? current.filter((m) => m !== moodSlug) : [...current, moodSlug],
    });
  };

  if (moodsQuery.isLoading || genresQuery.isLoading) {
    return <Typography sx={{ p: 2 }}>Loading…</Typography>;
  }

  return (
    <Paper
      variant="outlined"
      sx={embedded ? { p: 2, boxShadow: 'none' } : { p: 4 }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="subtitle1" gutterBottom>Moods</Typography>
          <Stack spacing={1}>
            {moods.map((m) => (
              <Stack key={m.slug} direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  label="Label"
                  value={m.label}
                  onChange={(e) => {
                    setMoods(moods.map((row) => (
                      row.slug === m.slug ? { ...row, label: e.target.value } : row
                    )));
                  }}
                  sx={{ minWidth: 180 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                  {m.slug}
                </Typography>
                <IconButton aria-label={`delete mood ${m.slug}`} onClick={() => removeMood(m.slug)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                label="New mood"
                value={newMoodLabel}
                onChange={(e) => setNewMoodLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMood();
                  }
                }}
              />
              <Button startIcon={<AddIcon />} onClick={addMood}>Add</Button>
            </Stack>
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle1" gutterBottom>Genre → mood mappings</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Pick a genre, then tap the moods that should apply. Unmapped genres are fine.
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 1.5, maxWidth: 360 }}>
            <InputLabel variant="standard" htmlFor="mood-map-genre" shrink>
              Genre
            </InputLabel>
            <NativeSelect
              id="mood-map-genre"
              value={selectedGenreSlug}
              onChange={(e) => setSelectedGenreSlug(e.target.value)}
            >
              {genreList.map((g) => {
                const count = (mappingsByGenre[g.slug] || []).length;
                const suffix = count ? ` (${count})` : '';
                return (
                  <option key={g.slug} value={g.slug}>
                    {g.label}{suffix}
                  </option>
                );
              })}
            </NativeSelect>
          </FormControl>
          {selectedGenreSlug ? (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                {selectedMappedCount
                  ? `${selectedMappedCount} mood${selectedMappedCount === 1 ? '' : 's'} selected`
                  : 'No moods mapped yet'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {moods.map((m) => {
                  const selected = (mappingsByGenre[selectedGenreSlug] || []).includes(m.slug);
                  return (
                    <Chip
                      key={m.slug}
                      size="small"
                      label={m.label}
                      clickable
                      color={selected ? 'primary' : 'default'}
                      variant={selected ? 'filled' : 'outlined'}
                      onClick={() => toggleMapping(selectedGenreSlug, m.slug)}
                    />
                  );
                })}
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No genres in the catalog yet.</Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            Save
          </Button>
          {onClose && (
            <Button variant="outlined" onClick={onClose}>Cancel</Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default MoodsSettings;
