import { useState } from 'react';
import { useQuery, useMutation, useQueryClient  } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Paper, Button, TextField, Stack, FormControl, IconButton, InputLabel, NativeSelect } from '@mui/material';
import {getWatchable, saveWatchable, getProviders} from './api';
import SearchIcon from '@mui/icons-material/Search';

function Watchable() {
    let { id } = useParams();
    const [ provider, setProvider ] = useState('');
    const navigate = useNavigate();
    const queryClient = useQueryClient()
    const { register, watch, handleSubmit, setValue } = useForm();   

    
    
    const { mutate } = useMutation({
        mutationFn: async (watchable) => {
            try {
                await saveWatchable(id, watchable);
                queryClient.invalidateQueries({ queryKey: ['watchable', id] });
                navigate('/');
                return true;
            } catch(e) {
                console.error(e);
            }
            return false;
        },
      });
    
    let { data, isLoading } = useQuery({ 
        queryKey: ['watchable', id], 
        queryFn: () => getWatchable(id),
        staleTime: Infinity, // do not refresh data
    });

    const providerQuery = useQuery({
        queryKey: ['providers'], 
        queryFn: getProviders,
        staleTime: Infinity,
    });

    let {web_url} = [""];
    const providers = providerQuery.data;
    const doSearch = () => {
        if (!providers) {
            return;
        }
        if (!provider) {
            setProvider(providers[0].url);
        }
        const url = provider.replace("%s", encodeURIComponent(data.watchable.title));
        window.open(url, "_blank", "noreferrer");
    };

    if (isLoading || providerQuery.isLoading) {
        // TODO: should probably move watchlistRes.isLoading into the actual select element
        return (<h5>Loading...</h5>);
    }
    data.watchable.urls.forEach((url) => {
        // provider_id = url.provider_id;
        if (url.service_type === 'web') {
            web_url = url.url;
        }
    });

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
                        Edit {data.watchable.title}
                    </Typography>
                    <Stack
                        direction="row"
                        justifyContent="flex-end"
                        alignItems="center"
                        spacing={1}
                        >
                        <FormControl>
                            <InputLabel variant="standard" htmlFor="uncontrolled-native">
                                Provider
                            </InputLabel>
                            <NativeSelect onChange={(e) => setProvider(e.target.value)}
                            >
                                {providers.map(item => {
                                    return (<option value={String(item.url)}>{item.name}</option>);
                                })}
                            </NativeSelect>
                        </FormControl>
                        <IconButton aria-label="search" onClick={doSearch}>
                                <SearchIcon />
                        </IconButton>                        
                    </Stack>
                    <TextField {...register("web_url")} label="Web URL" variant="outlined" sx={{
                        color: 'text.paper',
                    }} defaultValue={web_url} InputLabelProps={{ shrink: true }}/>
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
export default Watchable;