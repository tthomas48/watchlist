import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Paper, Stack, FormControlLabel, Checkbox, Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';

function StreamingAccess({ onClose, embedded }) {
  const messageContext = React.useContext(MessageContext);
  const api = new Api(messageContext);
  const navigate = useNavigate();
  const leave = onClose ?? (() => navigate('/'));
  const queryClient = useQueryClient();

  const catalogQuery = useQuery({
    queryKey: ['streaming-catalog'],
    queryFn: () => api.getStreamingCatalog(),
    staleTime: 5 * 60 * 1000,
  });
  const accessQuery = useQuery({
    queryKey: ['streaming-access'],
    queryFn: () => api.getStreamingAccess(),
    staleTime: 0,
  });

  const [direct, setDirect] = React.useState(() => new Set());
  const [addonsByHost, setAddonsByHost] = React.useState(() => ({}));
  const [receivers, setReceivers] = React.useState(() => ({}));

  React.useEffect(() => {
    const a = accessQuery.data;
    if (!a) {
      return;
    }
    setDirect(new Set(a.directServiceIds || []));
    const add = {};
    Object.entries(a.addonsByHost || {}).forEach(([host, arr]) => {
      add[host] = new Set(Array.isArray(arr) ? arr : []);
    });
    setAddonsByHost(add);
    setReceivers({ ...(a.receiversEnabled || {}) });
  }, [accessQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (body) => api.putStreamingAccess(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streaming-access'] });
      onClose?.();
    },
  });

  if (catalogQuery.isLoading || accessQuery.isLoading) {
    return <Typography sx={{ p: 2 }}>Loading…</Typography>;
  }
  if (catalogQuery.isError || accessQuery.isError) {
    return (
      <Typography color="error" sx={{ p: 2 }}>
        {catalogQuery.error?.message || accessQuery.error?.message || 'Error'}
      </Typography>
    );
  }

  const catalog = catalogQuery.data;
  const services = catalog?.services || [];
  const receiverKeys = catalog?.receiverKeys || [];

  const toggleDirect = (id) => () => {
    setDirect((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  };

  const toggleAddon = (hostId, addonId) => () => {
    setAddonsByHost((prev) => {
      const next = { ...prev };
      const set = new Set(next[hostId] ? [...next[hostId]] : []);
      if (set.has(addonId)) {
        set.delete(addonId);
      } else {
        set.add(addonId);
      }
      if (set.size === 0) {
        delete next[hostId];
      } else {
        next[hostId] = set;
      }
      return next;
    });
  };

  const toggleReceiver = (key) => (event) => {
    setReceivers((prev) => ({ ...prev, [key]: event.target.checked }));
  };

  const handleSave = () => {
    const addObj = {};
    Object.entries(addonsByHost).forEach(([host, set]) => {
      if (set && set.size > 0) {
        addObj[host] = [...set];
      }
    });
    saveMutation.mutate({
      country: catalog.country,
      directServiceIds: [...direct],
      addonsByHost: addObj,
      receiversEnabled: receivers,
    });
  };

  return (
    <Paper
      variant="outlined"
      sx={embedded ? { p: 2, m: 0, maxWidth: 'none', boxShadow: 'none' } : { p: 2, m: 2, maxWidth: 720 }}
    >
      {!embedded && (
      <Typography variant="h6" gutterBottom>Streaming access</Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Catalog region:
        {' '}
        <strong>{catalog.country}</strong>
        . Enable the services and add-ons you subscribe to (including free apps such as Tubi).
        The add-item dialog uses this in Subscription mode.
      </Typography>

      <Typography variant="subtitle1" sx={{ mt: 2 }}>Receivers (device / app handlers)</Typography>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 2 }}>
        {receiverKeys.map((key) => (
          <FormControlLabel
            key={key}
            control={(
              <Checkbox
                checked={receivers[key] !== false}
                onChange={toggleReceiver(key)}
              />
            )}
            label={key}
          />
        ))}
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1">Direct subscriptions (native apps)</Typography>
      <Stack spacing={0.5} sx={{ maxHeight: 280, overflow: 'auto', mb: 2 }}>
        {services.map((s) => (
          <FormControlLabel
            key={s.id}
            control={(
              <Checkbox
                checked={direct.has(s.id)}
                onChange={toggleDirect(s.id)}
              />
            )}
            label={`${s.name} (${s.id})`}
          />
        ))}
      </Stack>

      <Typography variant="subtitle1">Add-on channels (on each host)</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        e.g. Disney+ billed through Hulu — enable Disney+ under Hulu here.
      </Typography>
      <Stack spacing={2} sx={{ maxHeight: 360, overflow: 'auto', mb: 2 }}>
        {services.filter((s) => (s.addons || []).length > 0).map((s) => (
          <Box key={s.id}>
            <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} sx={{ pl: 1 }}>
              {(s.addons || []).map((a) => (
                <FormControlLabel
                  key={`${s.id}-${a.id}`}
                  control={(
                    <Checkbox
                      size="small"
                      checked={Boolean(addonsByHost[s.id]?.has(a.id))}
                      onChange={toggleAddon(s.id, a.id)}
                    />
                  )}
                  label={`${a.name} (${a.id})`}
                />
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          Save
        </Button>
        <Button variant="outlined" onClick={leave}>
          {onClose ? 'Close' : 'Back'}
        </Button>
      </Stack>
    </Paper>
  );
}

export default StreamingAccess;
