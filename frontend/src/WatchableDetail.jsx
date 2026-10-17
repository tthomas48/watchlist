import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import LiveTv from '@mui/icons-material/LiveTv';
import PlayButton from './PlayButton';
import TrailerButton from './TrailerButton';
import getStreamingServiceIcon from './streamingServiceIcon';
import { formatGenreLabel, MOOD_OPTIONS } from './browseFilters';

const OVERVIEW_COLLAPSED_LINES = 4;

function moodLabel(id) {
  return MOOD_OPTIONS.find((m) => m.id === id)?.label || formatGenreLabel(id);
}

export function WatchableDetailContent({
  item,
  player,
  onEdit,
  onClose,
}) {
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const serviceIcon = getStreamingServiceIcon(item.streaming_service_id);
  const hasOverview = Boolean(item.overview);
  const genres = Array.isArray(item.genres) ? item.genres : [];
  const moods = Array.isArray(item.moods) ? item.moods : [];

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
            {(genres.length > 0 || moods.length > 0) && (
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mb: 1.5 }}>
                {genres.map((g) => (
                  <Chip key={`g-${g}`} size="small" label={formatGenreLabel(g)} variant="outlined" />
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
                sx={{ display: 'inline-block' }}
              >
                Roger Ebert review
              </Link>
            )}
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
