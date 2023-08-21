import { useQuery } from '@tanstack/react-query'
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { NativeSelect } from '@mui/material';
import { getLists } from './api';

function ListPicker({list, setList }) {
    const query = useQuery({ queryKey: ['lists'], queryFn: getLists })

    return (
        <FormControl fullWidth>
            <InputLabel variant="standard" htmlFor="uncontrolled-native">
                List
            </InputLabel>
            <NativeSelect value={list} onChange={(e) => setList(e.target.value)}>
                {query.data?.map((item) => {
                    return (<option key={item.ids.trakt} value={item.ids.trakt}>{item.name}</option>);
                })}
            </NativeSelect>
        </FormControl>
    );
}
export default ListPicker;