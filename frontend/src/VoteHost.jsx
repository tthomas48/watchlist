import { useContext, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Box, Button, Container, Typography, Stack, List, ListItem, ListItemText,
  LinearProgress, Card, CardMedia, CardContent, Link, Paper,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { QRCodeSVG } from 'qrcode.react';
import Api from './service/api';
import { MessageContext } from './context/MessageContext';
import { fetchVoteSession } from './service/voteApi';

function CandidateCard({ candidate, footer }) {
  if (!candidate) {
    return null;
  }
  return (
    <Card sx={{ maxWidth: 480, width: '100%' }}>
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
          <Link href={candidate.rogerebertUrl} target="_blank" rel="noreferrer" sx={{ display: 'inline-block', mb: footer ? 2 : 0 }}>
            Roger Ebert review
          </Link>
        )}
        {footer}
      </CardContent>
    </Card>
  );
}

function VoteHost() {
  const { code } = useParams();
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);

  const sessionQuery = useQuery({
    queryKey: ['vote-session-host', code],
    queryFn: () => fetchVoteSession(code),
    refetchInterval: 1000,
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

  const handlePlayWinner = () => {
    playMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (session?.serviceType === 'browser' && result?.uri) {
          window.open(result.uri, 'watchlist_view_window', 'noreferrer');
        }
      },
    });
  };

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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Waiting for a player to start voting
          </Typography>
          <List dense sx={{ width: '100%', maxWidth: 360 }}>
            {session.participants.map((p) => (
              <ListItem key={p.id}>
                <ListItemText primary={p.displayName} />
              </ListItem>
            ))}
          </List>
        </Stack>
      )}

      {session.status === 'active' && session.phase === 'round1' && (
        <Stack spacing={2} alignItems="center" sx={{ width: '100%' }}>
          <Typography variant="h6" textAlign="center">Swipe round — do we watch this?</Typography>
          <Box sx={{ width: '100%', maxWidth: 480, mx: 'auto' }}>
            <CandidateCard candidate={session.currentCandidate} />
          </Box>
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
        <Stack spacing={2} alignItems="center" sx={{ width: '100%' }}>
          <Typography variant="h5">Winner</Typography>
          <Box sx={{ width: '100%', maxWidth: 480, mx: 'auto' }}>
            <CandidateCard
              candidate={session.winner}
              footer={(
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<PlayArrowIcon />}
                  onClick={handlePlayWinner}
                  disabled={playMutation.isPending}
                  sx={{ mt: 1 }}
                >
                  {playMutation.isPending ? 'Launching…' : 'Play'}
                </Button>
              )}
            />
          </Box>
        </Stack>
      )}
    </Container>
  );
}

export default VoteHost;
