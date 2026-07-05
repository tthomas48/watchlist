import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSwipeable } from 'react-swipeable';
import {
  Box, Button, Container, Typography, Stack, TextField, Card,
  CardMedia, CardContent, LinearProgress,
} from '@mui/material';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import {
  castVote,
  fetchVoteSession,
  joinVoteSession,
  loadParticipantId,
  saveParticipantId,
} from './service/voteApi';

function VoteMobile() {
  const { code } = useParams();
  const [displayName, setDisplayName] = useState('');
  const [participantId, setParticipantId] = useState(() => loadParticipantId(code));
  const [joinError, setJoinError] = useState(null);
  const [round1VotedFor, setRound1VotedFor] = useState(null);
  const [round2Picked, setRound2Picked] = useState(false);

  const sessionQuery = useQuery({
    queryKey: ['vote-session-mobile', code, participantId],
    queryFn: () => fetchVoteSession(code),
    enabled: Boolean(participantId),
    refetchInterval: 1000,
  });

  const joinMutation = useMutation({
    mutationFn: () => joinVoteSession(code, displayName),
  });

  const voteMutation = useMutation({
    mutationFn: (payload) => castVote(code, { participantId, ...payload }),
  });

  const session = sessionQuery.data;

  useEffect(() => {
    setRound1VotedFor(null);
  }, [session?.currentCandidate?.id]);

  useEffect(() => {
    if (session?.phase === 'round2') {
      setRound2Picked(false);
    }
  }, [session?.phase]);

  const voting = voteMutation.isPending;

  const handleJoin = () => {
    joinMutation.mutate(undefined, {
      onSuccess: (data) => {
        saveParticipantId(code, data.participantId);
        setParticipantId(data.participantId);
        setJoinError(null);
      },
      onError: (e) => setJoinError(e.message),
    });
  };

  const submitVote = (payload) => {
    voteMutation.mutate(payload, {
      onSuccess: (_data, variables) => {
        if (variables.vote === 'pick') {
          setRound2Picked(true);
        } else if (variables.watchableId != null) {
          setRound1VotedFor(variables.watchableId);
        }
        sessionQuery.refetch();
      },
    });
  };

  const submitSwipe = (vote) => {
    if (!session?.currentCandidate || voting) {
      return;
    }
    submitVote({ vote, watchableId: session.currentCandidate.id });
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => submitSwipe('reject'),
    onSwipedRight: () => submitSwipe('want'),
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  if (!participantId) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Join voting session</Typography>
        <Stack spacing={2}>
          <TextField
            label="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
          />
          {joinError && <Typography color="error">{joinError}</Typography>}
          <Button
            variant="contained"
            disabled={!displayName.trim() || joinMutation.isPending}
            onClick={handleJoin}
          >
            Join
          </Button>
        </Stack>
      </Container>
    );
  }

  if (sessionQuery.isLoading) {
    return <Container sx={{ py: 4 }}><Typography>Loading…</Typography></Container>;
  }

  if (!session) {
    return <Container sx={{ py: 4 }}><Typography color="error">Session not found</Typography></Container>;
  }

  if (session.status === 'lobby') {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6">Waiting for host to start…</Typography>
        <Typography color="text.secondary">You joined as {displayName || 'player'}</Typography>
      </Container>
    );
  }

  if (session.status === 'active' && session.phase === 'round1' && session.currentCandidate) {
    const alreadyVoted = round1VotedFor === session.currentCandidate.id;
    const c = session.currentCandidate;
    return (
      <Container maxWidth="sm" sx={{ py: 2 }} {...swipeHandlers}>
        <Typography variant="h6" align="center" gutterBottom>
          Swipe left = skip · right = want
        </Typography>
        <Card sx={{ touchAction: 'none' }}>
          <CardMedia component="img" height="320" image={c.imageUrl} alt={c.title} />
          <CardContent>
            <Typography variant="h6">{c.title}</Typography>
            {c.overview && (
              <Typography variant="body2" color="text.secondary">{c.overview}</Typography>
            )}
          </CardContent>
        </Card>
        {!alreadyVoted ? (
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<ThumbDownIcon />}
              disabled={voting}
              onClick={() => submitSwipe('reject')}
            >
              Skip
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<ThumbUpIcon />}
              disabled={voting}
              onClick={() => submitSwipe('want')}
            >
              Want
            </Button>
          </Stack>
        ) : (
          <Typography align="center" sx={{ mt: 2 }}>Vote submitted — waiting for others…</Typography>
        )}
      </Container>
    );
  }

  if (session.status === 'final' && session.phase === 'round2') {
    const myPickSubmitted = round2Picked;
    return (
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Typography variant="h6" align="center" gutterBottom>Pick your favorite</Typography>
        <Stack spacing={2}>
          {session.finalists.map((f) => (
            <Card key={f.id}>
              <Stack direction="row" spacing={2} alignItems="center">
                <CardMedia
                  component="img"
                  sx={{ width: 100, height: 140, objectFit: 'cover' }}
                  image={f.imageUrl}
                  alt={f.title}
                />
                <CardContent sx={{ flex: 1 }}>
                  <Typography variant="subtitle1">{f.title}</Typography>
                  <Button
                    variant="contained"
                    disabled={voting || myPickSubmitted}
                    onClick={() => submitVote({ vote: 'pick', watchableId: f.id })}
                    sx={{ mt: 1 }}
                  >
                    Vote
                  </Button>
                </CardContent>
              </Stack>
            </Card>
          ))}
        </Stack>
        {myPickSubmitted && (
          <Typography align="center" sx={{ mt: 2 }}>Waiting for final results…</Typography>
        )}
      </Container>
    );
  }

  if (session.status === 'complete' && session.winner) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>Winner</Typography>
        <Typography variant="h6">{session.winner.title}</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4, textAlign: 'center' }}>
      <Typography>Waiting…</Typography>
      <LinearProgress sx={{ mt: 2 }} />
    </Container>
  );
}

export default VoteMobile;
