import ToggleButton from '@mui/material/Button';
import CheckIcon from '@mui/icons-material/Check';

function ShowHiddenButton({ showHidden, setShowHidden }) {
  return (
    <ToggleButton
      value="check"
      selected={showHidden}
      onClick={() => {
        setShowHidden(!showHidden);
      }}
    >
      <CheckIcon /> { showHidden ? 'Hide' : 'Show' }
    </ToggleButton>
  );
}
export default ShowHiddenButton;
