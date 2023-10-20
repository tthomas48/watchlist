import { useQuery, useMutation, useQueryClient  } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Paper, Button, TextField, Stack, FormControl, InputLabel, NativeSelect } from '@mui/material';
import {getWatchable, saveWatchable, getWatchableUrls} from './api';

function Watchable() {
    let { id } = useParams();
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

    let {web_url} = [""];
    // const providerIdField = register("provider_id");
    // const watched = watch("provider_id");
    // let {provider_id, web_url} = ["", "", "", ""];
    // useQuery({ 
    //     queryKey: ['watchlist', id + watched], 
    //     queryFn: async () => {
    //         if (watched === -1 || watched === undefined) { 
    //             // so this should probably use the values from the watchable
    //             if (data.watchable.urls.length > 0 && data.watchable.urls[0].provider_id === -1) {
    //                 return { data: data.watchable.urls, isFetched: true, isLoading: false };
    //             }
    //             return { data: [{service_type: 'web', url: ""}, ], isFetched: true, isLoading: false };                
    //         }
    //         const res = await getWatchableUrls(id, watched);
    //         res.forEach((url) => {
    //             if (url.service_type === 'web') {
    //                 setValue('web_url', url.url);
    //             }
    //         });
    //         return res;
    //     }, 
    //     notifyOnChangeProps: [watched],
    //     enabled: !isLoading });

 
    if (isLoading) {
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
                    {/* // on change needs to load new URLs */}
                    {/* <FormControl>
                        <InputLabel variant="standard" htmlFor="uncontrolled-native">
                            Provider
                        </InputLabel>
                        <NativeSelect defaultValue={provider_id} 
                         onChange={(e) => {
                            providerIdField.onChange(e); // react hook form onChange
                            provider_id = e.target.value;
                          }}
                          onBlur={providerIdField.onBlur}
                          ref={providerIdField.ref}
                          name={providerIdField.name}
                          >
                            <option value="-1">Custom</option>
                            {data.providers.map(item => {
                                return (<option value={String(item.id)}>{item.clear_name}</option>);
                            })}
                        </NativeSelect>
                    </FormControl> */}
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