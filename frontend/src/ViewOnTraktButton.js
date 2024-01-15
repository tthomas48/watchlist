import Button from '@mui/material/Button';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

function ViewOnTraktButton({ traktId, mediaType }) {
  const viewAction = async () => {
    const url = `https://trakt.tv/${mediaType}/${traktId}`;
    window.open(url, '_watchlist', 'noreferrer');
  };

  return (
    <Button onClick={viewAction} startIcon={<OpenInNewIcon />}>
      View on Trakt
    </Button>
  );
}
export default ViewOnTraktButton;
