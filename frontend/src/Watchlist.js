import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from "react-router-dom";
import { getWatchlist } from './api';
import {CardHeader, Card, CardMedia, CardActions, Box} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2'; 
import PlayButton from './PlayButton';
import EditButton from './EditButton';
import RemoteControl from './RemoteControl';

function Watchlist() {
    // Queries
    const [list, player] = useOutletContext();
    const { data, isLoading, isError, error } = useQuery({ queryKey: ['watchlist', list], queryFn: () => getWatchlist(list) });
    
    return (
        <div>
            <div className="provider-container">
                <h2>To Watch</h2>
                <div>
                    {isLoading && <div>Loading...</div>}
                    {isError && <div>Error: {error.message}</div>}
                    <Grid container spacing={2}>
                    {data?.map((item) => (
                        <Grid xs={6} md={3}>
                            <Card key={item.title} sx={{
                                backgroundColor: '#278056',
                            }}>
                                <CardHeader title={item.title} sx={{
                                    fontSize: '1.0rem',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                }}></CardHeader>
                                <CardMedia component="img" image={item.image} alt={item.title} />
                                <CardActions disableSpacing>
                                    <PlayButton player={player} id={item.id}></PlayButton>
                                    <EditButton id={item.id}></EditButton>
                                </CardActions>
                            </Card>
                        </Grid>                        
                    ))}
                    </Grid>
                </div>
            </div>
            <Box id="remote-control" sx={{
                position: 'fixed',
                bottom: '0px',
                right: '0px',
            }}>
                <RemoteControl player={player} />
            </Box>
        </div>        
    );
}
export default Watchlist;
