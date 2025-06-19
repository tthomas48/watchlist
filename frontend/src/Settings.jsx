import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useQuery,
  useQueryClient,
  useMutation,
} from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Typography, Paper, Button, TextField, Stack,
} from '@mui/material';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';
import './Settings.css';

function Settings() {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => api.getSettings(),
    staleTime: Infinity, // do not refresh data
  });

  const { mutate } = useMutation({
    mutationFn: async (newSettings) => {
      const res = await api.saveSettings(newSettings);
      if (res) {
        queryClient.invalidateQueries({ queryKey: ['settings'] });
        navigate('/');
        return true;
      }
      return false;
    },
  });
  const { register, handleSubmit } = useForm();

  if (isLoading) {
    return (<h5>Loading...</h5>);
  }
  const formData = data || {};
  return (
    <Paper variant="outlined" sx={{
      padding: 4,
    }}>
      <form onSubmit={handleSubmit(mutate)}>
        <Stack
            direction="column"
            justifyContent="center"
            alignItems="center"
            spacing={2}
        >
          <Typography variant="h6" sx={{
            color: 'text.paper',
          }}>
            Settings
          </Typography>
          <TextField {...register('googletv_host')} label="Google TV Host" variant="outlined" sx={{
            color: 'text.paper',
          }} defaultValue={formData.googletv_host} />
          <TextField {...register('googletv_port')} label="Google TV Port" variant="outlined" sx={{
            color: 'text.paper',
          }} defaultValue={formData.googletv_port} />
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={1}
          >
            <Button variant="outlined" type="submit">Save</Button>
            <Button variant="outlined" onClick={() => navigate('/')}>Cancel</Button>
          </Stack>
        </Stack>
      </form>
    </Paper>
  );
}
export default Settings;
