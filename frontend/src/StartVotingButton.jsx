import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Button from '@mui/material/Button';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import Api from './service/api';
import { MessageContext } from './context/MessageContext';

function StartVotingButton({ list, player }) {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const navigate = useNavigate();

  const serviceType = player || 'adb-googletv';

  const createSession = useMutation({
    mutationFn: async () => {
      if (!list?.user?.username || list?.ids?.trakt == null) {
        throw new Error('Select a list first');
      }
      return api.createVoteSession({
        traktListId: list.ids.trakt,
        traktListUserSlug: list.user.username,
        serviceType,
      });
    },
    onSuccess: (data) => {
      navigate(`/vote-host/${data.code}`);
    },
    onError: (e) => {
      messageContext.sendMessage({
        message: e.message,
        severity: 'error',
        open: true,
      });
    },
  });

  return (
    <Button
      variant="outlined"
      startIcon={<HowToVoteIcon />}
      onClick={() => createSession.mutate()}
      disabled={!list || createSession.isLoading}
    >
      Start voting
    </Button>
  );
}

export default StartVotingButton;
