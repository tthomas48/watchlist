import { useMutation } from '@tanstack/react-query';
import ToggleButton from '@mui/material/Button';
import CheckIcon from '@mui/icons-material/Check';

function HideButton({ item, saveWatchable }) {
  const toggleHidden = useMutation({
    mutationFn: async (watchable) => saveWatchable(watchable),
  });

  return (
    <ToggleButton
      value="check"
      selected={item.hidden}
      onClick={() => {
        item.hidden = !item.hidden;
        toggleHidden.mutate(item);
      }}
    >
      <CheckIcon /> {item.hidden ? 'Show' : 'Hide'}
    </ToggleButton>
  );
}
export default HideButton;
