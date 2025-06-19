import { useContext } from 'react';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  useQueryClient,
  useMutation,
} from '@tanstack/react-query';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';

function RefreshButton({ list, sort }) {
  const messageContext = useContext(MessageContext);
  const queryClient = useQueryClient();
  const api = new Api(messageContext);

  const { mutate } = useMutation({
    mutationFn: async () => {
      const res = await api.refresh(list);
      if (res) {
        return true;
      }
      return false;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', list, sort] });
      queryClient.invalidateQueries({ queryKey: ['notifications', list] });
    },
  });

  return (
    <Button aria-label="refresh list" volot="secondary" onClick={async () => mutate()} startIcon={<RefreshIcon />}>
      Refresh
    </Button>
  );
}
export default RefreshButton;
