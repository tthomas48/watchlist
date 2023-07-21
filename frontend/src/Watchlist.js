import {
    useQuery,
    // useMutation,
    // useQueryClient,
} from '@tanstack/react-query'
import { getWatchlist } from './api';


function Watchlist({ list }) {
    // Access the client
    // const queryClient = useQueryClient()

    // Queries
    console.log('here');
    console.log(list);
    const { data, isLoading, isError, error } = useQuery({ queryKey: ['watchlist', list], queryFn: () => getWatchlist(list) });
    console.log(error);
    console.log(isLoading);

    const watch = (item) => {
        console.log(item);
        return false;
    };

    // Mutations
    // const mutation = useMutation({
    //   mutationFn: postTodo,
    //   onSuccess: () => {
    //     // Invalidate and refetch
    //     queryClient.invalidateQueries({ queryKey: ['todos'] })
    //   },
    // })

    return (
        <div className="provider-container">
            <h2>To Watch</h2>
            <ul>
                {isLoading && <div>Loading...</div>}
                {isError && <div>Error: {error.message}</div>}
                {data?.map((item) => (
                    <li key={item.title}>
                        <img src={item.image} alt={item.title} className="title-image" />
                        {/* <a onClick={watch(item)} target="_blank" rel="noopener noreferrer">{item.title}</a> */}
                        <a name={item.trakt_id}>{item.title}</a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
export default Watchlist;
