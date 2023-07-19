import {
    useQuery,
    // useMutation,
    // useQueryClient,
} from '@tanstack/react-query'
import { getWatchlist } from './api';


function Watchlist() {
    // Access the client
    // const queryClient = useQueryClient()

    // Queries
    const query = useQuery({ queryKey: ['watchlist'], queryFn: getWatchlist })

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
                {query.data?.map((item) => (
                    <li key={item.show.title}>
                        <img src={item.image} alt={item.show.title} className="title-image" />
                        <a href={item.url} target="_blank" rel="noopener noreferrer">{item.show.title}</a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
export default Watchlist;
