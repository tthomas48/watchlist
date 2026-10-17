import { Box, Typography } from '@mui/material';
import { personAvatarSrc, personInitials } from './personAvatar';

const badgeSx = {
  borderRadius: '50%',
  overflow: 'hidden',
  bgcolor: 'primary.main',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.28)',
  border: '2px solid rgba(255,255,255,0.35)',
  flexShrink: 0,
};

/**
 * Circular person avatar with initials fallback (matches streaming badge language).
 */
function PersonAvatar({
  person, size = 48, fontSize, title, sx = {}, cacheBust,
}) {
  const src = personAvatarSrc(person, cacheBust);
  const label = person?.name || 'Person';
  const initials = personInitials(label);
  const inner = Math.max(size - 4, 12);
  const textSize = fontSize || Math.round(size * 0.38);

  return (
    <Box
      title={title || label}
      aria-label={title || label}
      sx={{
        ...badgeSx,
        width: size,
        height: size,
        ...sx,
      }}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          alt=""
          sx={{
            width: inner,
            height: inner,
            objectFit: 'cover',
            borderRadius: '50%',
          }}
        />
      ) : (
        <Typography
          component="span"
          sx={{
            color: 'primary.contrastText',
            fontWeight: 700,
            fontSize: textSize,
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {initials}
        </Typography>
      )}
    </Box>
  );
}

export default PersonAvatar;
