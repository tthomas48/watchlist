import { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Paper, Button, TextField, Stack, FormControl,
  FormHelperText, IconButton, InputLabel, NativeSelect,
  Tabs, Box, Tab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

function CustomTabPanel(props) {
  const {
    children, value, index, ...other
  } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function Watchable() {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);

  const { id } = useParams();
  const [provider, setProvider] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register, handleSubmit, getValues,
  } = useForm();

  const { mutate } = useMutation({
    mutationFn: async (watchable) => {
      try {
        await api.saveWatchable(id, watchable);
        queryClient.invalidateQueries({ queryKey: ['watchable', id] });
        navigate('/');
        return true;
      } catch (e) {
        this.messageContext.sendMessage({
          message: e.message,
          severity: 'error',
          open: true,
        });
      }
      return false;
    },
  });

  const {
    data, isLoading,
  } = useQuery({
    queryKey: ['watchable', id],
    queryFn: async () => api.getWatchable(id),
    staleTime: Infinity, // do not refresh data
  });

  const providerQuery = useQuery({
    queryKey: ['providers'],
    queryFn: async () => api.getProviders(),
    staleTime: Infinity,
  });

  const providers = providerQuery.data;
  const doSearch = () => {
    if (!providers) {
      return;
    }
    if (!provider) {
      setProvider(providers[0].url);
    }
    const url = provider.replace('%s', encodeURIComponent(data.watchable.title));
    window.open(url, '_watchlist', 'noreferrer');
  };

  const doDownload = async (item) => {
    const values = getValues();
    await api.updateImage(item.id, values.image_url);
    queryClient.invalidateQueries({ queryKey: ['watchable', id] });
  };

  const doDelete = async (item) => {
    await api.deleteWatchable(item.id);
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    queryClient.invalidateQueries({ queryKey: ['watchable', id] });
    navigate('/');
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  if (isLoading || providerQuery.isLoading) {
    return (<h5>Loading...</h5>);
  }

  return (
    <Paper variant="outlined" sx={{
      padding: 4,
    }}>
      <Typography variant="h6" sx={{
        color: 'text.paper',
      }}>
        Edit {data.watchable.title}
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabIndex} onChange={handleTabChange} aria-label="watchable edit tabs">
          <Tab label="General" {...a11yProps(0)} />
          <Tab label="Episodes" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <CustomTabPanel value={tabIndex} index={0}>
        <form onSubmit={handleSubmit(mutate)}>
          <Stack
            direction="column"
            justifyContent="flex-start"
            alignItems="flex-start"
            spacing={2}
          >
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
                <NativeSelect onChange={(e) => setProvider(e.target.value)}>
                  {providers.map((item) => (<option key={item.url}
                    value={String(item.url)}>{item.name}</option>))}
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
            <TextField {...register('webUrl')} label="Web URL" variant="outlined" sx={{
              color: 'text.paper',
            }} defaultValue={data.watchable.web_url} InputLabelProps={{ shrink: true }} />

            <Stack
              direction="row"
              justifyContent="center"
              alignItems="flex-start"
              spacing={1}
            >
              <FormControl>
                <TextField {...register('image_url')} label="Image URL" variant="outlined" sx={{
                  color: 'text.paper',
                  overflow: 'hidden',
                  maxWidth: '162px',
                }} InputLabelProps={{ shrink: true }} />
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
              sx={{ flexGrow: 1 }}
            >
              <Button variant="outlined" type="submit">Save</Button>
              <Button variant="outlined" onClick={() => navigate('/')}>Cancel</Button>
              <Button variant="outlined" onClick={() => doDelete(data.watchable)} disabled={!data.watchable.local}>Delete</Button>
            </Stack>
          </Stack>
        </form>
      </CustomTabPanel>
      <CustomTabPanel value={tabIndex} index={1}>
        Episode Button Refresh goes here
      </CustomTabPanel>
    </Paper>
  );
}
export default Watchable;
