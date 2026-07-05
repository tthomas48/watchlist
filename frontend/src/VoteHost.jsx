import { useContext, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Box, Button, Container, Typography, Stack, List, ListItem, ListItemText,
  LinearProgress, Card, CardMedia, CardContent, Link, Paper,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import Api from './service/api';
import { MessageContext } from './context/MessageContext';
import { fetchVoteSession } from './service/voteApi';

function CandidateCard({ candidate }) {
  if (!candidate) {
    return null;
  }
  return (
    <Card sx={{ maxWidth: 480, mx: 'auto' }}>
      <CardMedia
        component="img"
        height="360"
        image={candidate.imageUrl}
        alt={candidate.title}
      />
      <CardContent>
        <Typography variant="h5" gutterBottom>{candidate.title}</Typography>
        {candidate.overview && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {candidate.overview}
          </Typography>
        )}
        {candidate.rogerebertUrl && (
          <Link href={candidate.rogerebertUrl} target="_blank" rel="noreferrer">
            Roger Ebert review
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function VoteHost() {
  const { code } = useParams();
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const [played, setPlayed] = useState(false);
  const playStarted = useRef(false);

  const sessionQuery = useQuery({
    queryKey: ['vote-session-host', code],
    queryFn: () => fetchVoteSession(code),
    refetchInterval: 1000,
  });

  const startMutation = useMutation({
    mutationFn: () => api.startVoteSession(code),
  });

  const playMutation = useMutation({
    mutationFn: () => api.playVoteWinner(code),
  });

  const session = sessionQuery.data;

  useEffect(() => {
    if (playMutation.isError && playMutation.error) {
      messageContext.sendMessage({
        message: playMutation.error.message,
        severity: 'error',
        open: true,
      });
    }
  }, [playMutation.isError, playMutation.error, messageContext]);

  useEffect(() => {
    if (
      session?.status === 'complete'
      && session.winner
      && !playStarted.current
    ) {
      playStarted.current = true;
      setPlayed(true);
      playMutation.mutate();
    }
  }, [session?.status, session?.winner, playMutation]);

  if (sessionQuery.isLoading) {
    return <Container sx={{ py: 4 }}><Typography>Loading session…</Typography></Container>;
  }
  if (sessionQuery.isError || !session) {
    return <Container sx={{ py: 4 }}><Typography color="error">Session not found</Typography></Container>;
  }

  const progress = session.voteProgress?.required
    ? (session.voteProgress.submitted / session.voteProgress.required) * 100
    : 0;

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>Voting session</Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Code: {session.code} · {session.status}
        {session.phase ? ` · ${session.phase}` : ''}
      </Typography>

      {session.status === 'lobby' && (
        <Stack spacing={3} alignItems="center">
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>Scan to join</Typography>
            {session.joinUrl && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <QRCodeSVG value={session.joinUrl} size={220} />
              </Box>
            )}
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{session.joinUrl}</Typography>
          </Paper>
          <Typography variant="h6">Players ({session.participants.length})</Typography>
          <List dense sx={{ width: '100%', maxWidth: 360 }}>
            {session.participants.map((p) => (
              <ListItem key={p.id}>
                <ListItemText primary={p.displayName} />
              </ListItem>
            ))}
          </List>
          <Button
            variant="contained"
            size="large"
            onClick={() => startMutation.mutate(undefined, {
              onSuccess: () => sessionQuery.refetch(),
              onError: (e) => {
                messageContext.sendMessage({
                  message: e.message,
                  severity: 'error',
                  open: true,
                });
              },
            })}
            disabled={!session.participants.length || startMutation.isPending}
          >
            Start voting
          </Button>
        </Stack>
      )}

      {session.status === 'active' && session.phase === 'round1' && (
        <Stack spacing={2}>
          <Typography variant="h6" textAlign="center">Swipe round — do we watch this?</Typography>
          <CandidateCard candidate={session.currentCandidate} />
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" align="center" gutterBottom>
              Votes: {session.voteProgress.submitted} / {session.voteProgress.required}
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        </Stack>
      )}

      {session.status === 'final' && session.phase === 'round2' && (
        <Stack spacing={2}>
          <Typography variant="h6" textAlign="center">Final vote — pick one</Typography>
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
            {session.finalists.map((f) => (
              <Card key={f.id} sx={{ width: 160 }}>
                <CardMedia component="img" height="200" image={f.imageUrl} alt={f.title} />
                <CardContent>
                  <Typography variant="subtitle2">{f.title}</Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" align="center" gutterBottom>
              Votes: {session.voteProgress.submitted} / {session.voteProgress.required}
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        </Stack>
      )}

      {session.status === 'complete' && session.winner && (
        <Stack spacing={2} alignItems="center">
          <Typography variant="h5">Winner</Typography>
          <CandidateCard candidate={session.winner} />
          {playMutation.isPending && <Typography>Launching…</Typography>}
        </Stack>
      )}
    </Container>
  );
}

export default VoteHost;
