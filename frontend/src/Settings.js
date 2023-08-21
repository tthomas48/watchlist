import {useNavigate} from 'react-router-dom';
import {
    useQuery,
    useMutation,
} from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Typography, Paper, Button, TextField, Stack } from '@mui/material';
import { getSettings, saveSettings } from './api';
import './Settings.css';

function Settings() {
    const navigate = useNavigate();

    let { data, isLoading } = useQuery({ 
        queryKey: ['settings'], 
        queryFn: getSettings,
        staleTime: Infinity, // do not refresh data
    })

    const { mutate } = useMutation({
        mutationFn: (newSettings) => {
            if (saveSettings(newSettings)) {
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
    data = data || {};
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
                    <TextField {...register("googletv_host")} label="Google TV Host" variant="outlined" sx={{
                        color: 'text.paper',
                    }} defaultValue={data.googletv_host} />
                    <TextField {...register("googletv_port")} label="Google TV Port" variant="outlined" sx={{
                        color: 'text.paper',
                    }} defaultValue={data.googletv_port} />
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