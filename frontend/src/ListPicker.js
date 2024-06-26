import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { NativeSelect } from '@mui/material';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';

function ListPicker({ list, setList }) {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const query = useQuery({ queryKey: ['lists'], queryFn: async () => api.getLists() });
  if (query.isLoading) {
    return (
      <FormControl fullWidth>
          <InputLabel variant="standard" htmlFor="uncontrolled-native">
              List
          </InputLabel>
      </FormControl>
    );
  }
  if (query.data?.length > 0 && !list) {
    setList(query.data[0]);
  }
  return (
    <FormControl fullWidth>
      <InputLabel variant="standard" htmlFor="uncontrolled-native">
        List
      </InputLabel>
      <NativeSelect value={list && list.ids ? list.ids.trakt : ''} onChange={(e) => setList(query.data.find((l) => String(l.ids.trakt) === String(e.target.value)))}>
        {query.data?.map((item) => (<option key={item.ids.trakt}
          value={item.ids.trakt}>{item.name}</option>))}
      </NativeSelect>
    </FormControl>
  );
}
export default ListPicker;
