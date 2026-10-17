import { useContext, useEffect, useState } from 'react';
import {
  useQuery,
  useQueryClient,
  useMutation,
} from '@tanstack/react-query';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';
import PersonAvatar from './PersonAvatar';
import AvatarCropDialog from './AvatarCropDialog';

function PeopleSettings({ onClose, embedded }) {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const queryClient = useQueryClient();

  const peopleQuery = useQuery({
    queryKey: ['people'],
    queryFn: async () => api.getPeople(),
  });

  const [rows, setRows] = useState([]);
  const [newName, setNewName] = useState('');
  const [cropSession, setCropSession] = useState(null);
  /** Bust browser cache for /api/img/people/:id after upload. */
  const [avatarBust, setAvatarBust] = useState({});

  useEffect(() => {
    if (!peopleQuery.data) return;
    setRows(peopleQuery.data.map((p) => ({
      id: p.id,
      name: p.name,
    })));
  }, [peopleQuery.data]);

  const closeCropDialog = () => {
    setCropSession((prev) => {
      if (prev?.imageSrc) {
        URL.revokeObjectURL(prev.imageSrc);
      }
      return null;
    });
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['people'] });
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const name = newName.trim();
      if (!name) throw new Error('Name is required');
      return api.createPerson({ name });
    },
    onSuccess: () => {
      setNewName('');
      invalidate();
      messageContext.sendMessage({
        message: 'Person added',
        severity: 'success',
        open: true,
      });
    },
    onError: (e) => {
      messageContext.sendMessage({
        message: e.message,
        severity: 'error',
        open: true,
      });
    },
  });

  const saveRowMutation = useMutation({
    mutationFn: async (row) => api.updatePerson(row.id, {
      name: row.name.trim(),
    }),
    onSuccess: () => {
      invalidate();
      messageContext.sendMessage({
        message: 'Person saved',
        severity: 'success',
        open: true,
      });
    },
    onError: (e) => {
      messageContext.sendMessage({
        message: e.message,
        severity: 'error',
        open: true,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.deletePerson(id),
    onSuccess: () => {
      invalidate();
    },
    onError: (e) => {
      messageContext.sendMessage({
        message: e.message,
        severity: 'error',
        open: true,
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ id, file }) => api.uploadPersonAvatar(id, file),
    onSuccess: (_data, variables) => {
      closeCropDialog();
      setAvatarBust((prev) => ({
        ...prev,
        [variables.id]: Date.now(),
      }));
      invalidate();
      messageContext.sendMessage({
        message: 'Avatar uploaded',
        severity: 'success',
        open: true,
      });
    },
    onError: (e) => {
      messageContext.sendMessage({
        message: e.message,
        severity: 'error',
        open: true,
      });
    },
  });

  const openCropForFile = (personId, file) => {
    if (!file) return;
    setCropSession((prev) => {
      if (prev?.imageSrc) {
        URL.revokeObjectURL(prev.imageSrc);
      }
      return {
        personId,
        imageSrc: URL.createObjectURL(file),
      };
    });
  };

  if (peopleQuery.isLoading) {
    return <Typography sx={{ p: 2 }}>Loading…</Typography>;
  }

  return (
    <Paper
      variant="outlined"
      sx={embedded ? { p: 2, boxShadow: 'none' } : { p: 4 }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="subtitle1" gutterBottom>People</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Track who recommended a title. Avatars show on posters opposite the streaming badge.
          </Typography>
          <Stack spacing={1.5}>
            {rows.map((row) => {
              const live = peopleQuery.data?.find((p) => p.id === row.id) || row;
              return (
                <Stack
                  key={row.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <PersonAvatar
                    person={live}
                    size={40}
                    cacheBust={avatarBust[row.id]}
                  />
                  <TextField
                    size="small"
                    label="Name"
                    value={row.name}
                    onChange={(e) => {
                      setRows(rows.map((r) => (
                        r.id === row.id ? { ...r, name: e.target.value } : r
                      )));
                    }}
                    sx={{ minWidth: 140, flex: 1 }}
                  />
                  <Button
                    size="small"
                    onClick={() => saveRowMutation.mutate(row)}
                    disabled={saveRowMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    component="label"
                    disabled={uploadMutation.isPending}
                  >
                    Upload
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) openCropForFile(row.id, file);
                      }}
                    />
                  </Button>
                  <IconButton
                    aria-label={`delete ${row.name}`}
                    onClick={() => deleteMutation.mutate(row.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              );
            })}
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>Add person</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TextField
              size="small"
              label="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  createMutation.mutate();
                }
              }}
              sx={{ minWidth: 160, flex: 1 }}
            />
            <Button
              startIcon={<AddIcon />}
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              Add
            </Button>
          </Stack>
        </Box>

        {onClose && !embedded && (
          <Box>
            <Button onClick={onClose}>Close</Button>
          </Box>
        )}
      </Stack>

      <AvatarCropDialog
        open={Boolean(cropSession)}
        imageSrc={cropSession?.imageSrc || null}
        applying={uploadMutation.isPending}
        onCancel={closeCropDialog}
        onApply={async (file) => {
          if (!cropSession?.personId) return;
          await uploadMutation.mutateAsync({ id: cropSession.personId, file });
        }}
      />
    </Paper>
  );
}

export default PeopleSettings;
