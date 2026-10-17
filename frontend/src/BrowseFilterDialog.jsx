import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  NativeSelect,
  TextField,
  Typography,
} from '@mui/material';
import {
  MOOD_OPTIONS,
  GENRE_OPTIONS,
  DECADE_OPTIONS,
  MEDIA_TYPE_OPTIONS,
  formatGenreLabel,
} from './browseFilters';

function BrowseFilterDialog({ open, onClose, filters, setFilters }) {
  const update = (patch) => setFilters({ ...filters, ...patch });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="browse-filter-dialog-title"
    >
      <DialogTitle id="browse-filter-dialog-title">Filter</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 0.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              I feel like…
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {MOOD_OPTIONS.map((m) => (
                <Chip
                  key={m.id}
                  label={m.label}
                  size="small"
                  clickable
                  color={filters.mood === m.id ? 'primary' : 'default'}
                  variant={filters.mood === m.id ? 'filled' : 'outlined'}
                  onClick={() => update({ mood: filters.mood === m.id ? '' : m.id })}
                />
              ))}
            </Box>
          </Box>

          <FormControl fullWidth size="small">
            <InputLabel variant="standard" htmlFor="browse-genre" shrink>
              Genre
            </InputLabel>
            <NativeSelect
              id="browse-genre"
              value={filters.genre || ''}
              onChange={(e) => update({ genre: e.target.value })}
            >
              <option value="">Any</option>
              {GENRE_OPTIONS.map((g) => (
                <option key={g} value={g}>{formatGenreLabel(g)}</option>
              ))}
            </NativeSelect>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel variant="standard" htmlFor="browse-decade" shrink>
              Decade
            </InputLabel>
            <NativeSelect
              id="browse-decade"
              value={filters.decade || ''}
              onChange={(e) => update({ decade: e.target.value })}
            >
              <option value="">Any</option>
              {DECADE_OPTIONS.map((d) => (
                <option key={d} value={String(d)}>{`${d}s`}</option>
              ))}
            </NativeSelect>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel variant="standard" htmlFor="browse-type" shrink>
              Type
            </InputLabel>
            <NativeSelect
              id="browse-type"
              value={filters.mediaType || ''}
              onChange={(e) => update({ mediaType: e.target.value })}
            >
              <option value="">Any</option>
              {MEDIA_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </NativeSelect>
          </FormControl>

          <TextField
            label="Search"
            variant="standard"
            size="small"
            fullWidth
            value={filters.q || ''}
            onChange={(e) => update({ q: e.target.value })}
            inputProps={{ 'aria-label': 'search titles' }}
          />

          <FormControl fullWidth size="small" disabled>
            <InputLabel variant="standard" htmlFor="browse-person" shrink>
              Recommended by
            </InputLabel>
            <NativeSelect id="browse-person" value="" disabled>
              <option value="">Soon</option>
            </NativeSelect>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default BrowseFilterDialog;
