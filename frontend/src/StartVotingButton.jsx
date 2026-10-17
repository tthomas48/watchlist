import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import Api from './service/api';
import { MessageContext } from './context/MessageContext';
import { hasActiveBrowseFilters, browseFiltersToQuery } from './browseFilters';

function StartVotingButton({ list, player, filters }) {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const navigate = useNavigate();
  const filtersActive = hasActiveBrowseFilters(filters);
  const [onlyFiltered, setOnlyFiltered] = useState(true);

  const serviceType = player || 'adb-googletv';

  const createSession = useMutation({
    mutationFn: async () => {
      if (!list?.user?.username || list?.ids?.trakt == null) {
        throw new Error('Select a list first');
      }
      const useListFilters = filtersActive && onlyFiltered;
      const query = browseFiltersToQuery(filters);
      return api.createVoteSession({
        traktListId: list.ids.trakt,
        traktListUserSlug: list.user.username,
        serviceType,
        useListFilters,
        filters: {
          ...(useListFilters ? query : {}),
          ...(query.video_store ? { video_store: query.video_store } : {}),
        },
      });
    },
  });

  const handleStart = () => {
    createSession.mutate(undefined, {
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
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      {filtersActive && (
        <FormControlLabel
          control={(
            <Checkbox
              size="small"
              checked={onlyFiltered}
              onChange={(e) => setOnlyFiltered(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          label="Only vote on filtered titles"
          onClick={(e) => e.stopPropagation()}
          sx={{ mb: 0.5, ml: 0 }}
        />
      )}
      <Button
        aria-label="start voting session"
        startIcon={<HowToVoteIcon />}
        onClick={handleStart}
        disabled={!list || createSession.isPending}
      >
        Start voting
      </Button>
    </Box>
  );
}

export default StartVotingButton;
