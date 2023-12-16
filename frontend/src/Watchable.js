import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Paper, Button, TextField, Stack, FormControl, FormHelperText, IconButton, InputLabel, NativeSelect } from '@mui/material';
import { getWatchable, saveWatchable, getProviders, updateImage, deleteWatchable } from './api';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';

function Watchable() {
    let { id } = useParams();
    const [provider, setProvider] = useState('');
    const navigate = useNavigate();
    const queryClient = useQueryClient()
    const { register, watch, handleSubmit, setValue, getValues } = useForm();



    const { mutate } = useMutation({
        mutationFn: async (watchable) => {
            try {
                await saveWatchable(id, watchable);
                queryClient.invalidateQueries({ queryKey: ['watchable', id] });
                navigate('/');
                return true;
            } catch (e) {
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

    let { web_url } = [""];
    const providers = providerQuery.data;
    const doSearch = () => {
        if (!providers) {
            return;
        }
        if (!provider) {
            setProvider(providers[0].url);
        }
        const url = provider.replace("%s", encodeURIComponent(data.watchable.title));
        window.open(url, "_watchlist", "noreferrer");
    };

    const doDownload = async (item) => {
        const values = getValues();
        await updateImage(item.id, values.image_url);        
        queryClient.invalidateQueries({ queryKey: ['watchable', id] });
    };

    const doDelete = async (item) => {
        await deleteWatchable(item.id);
        queryClient.invalidateQueries({ queryKey: ['watchlist'] });
        queryClient.invalidateQueries({ queryKey: ['watchable', id] });
        navigate('/');
    };

    if (isLoading || providerQuery.isLoading) {
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
                        justifyContent="center"
                        alignItems="flex-start"
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
                            <FormHelperText sx={{ overflow: 'hidden', maxWidth: '126px' }}>
                                The search icon will open a new tab to find the URL for this item.
                                Copy the link, swipe backwards, and paste the url into the field below.
                            </FormHelperText>
                        </FormControl>
                        <IconButton aria-label="search" onClick={doSearch}>
                            <SearchIcon />
                        </IconButton>
                    </Stack>
                    <TextField {...register("web_url")} label="Web URL" variant="outlined" sx={{
                        color: 'text.paper',
                    }} defaultValue={web_url} InputLabelProps={{ shrink: true }} />

                    <Stack
                        direction="row"
                        justifyContent="center"
                        alignItems="flex-start"
                        spacing={1}
                    >
                        <FormControl>
                            <TextField {...register("image_url")} label="Image URL" variant="outlined" sx={{
                                color: 'text.paper',
                                overflow: 'hidden',
                                maxWidth: '162px'
                            }} defaultValue={web_url} InputLabelProps={{ shrink: true }} />
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
                    >
                        <Button variant="outlined" type="submit">Save</Button>
                        <Button variant="outlined" onClick={() => navigate('/')}>Cancel</Button>
                        <Button variant="outlined" onClick={() => doDelete(data.watchable)} disabled={!data.watchable.local}>Delete</Button>
                    </Stack>
                </Stack>
            </form>
        </Paper>
    );
}
export default Watchable;