import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { NativeSelect } from '@mui/material';

function PlayerPicker({ setPlayer, player }) {
  const options = [];
  options.push({ label: 'Local', value: 'browser' });
  // FIXME: this is hardcoded
  const isADBSupported = true;
  if (isADBSupported) {
    options.push({ label: 'GoogleTV', value: 'googletv' });
  }
  return (
    <FormControl fullWidth>
      <InputLabel variant="standard" htmlFor="uncontrolled-native">
        Player
      </InputLabel>
      <NativeSelect value={player} onChange={(e) => setPlayer(e.target.value)}>
         {options.map((item) => (<option key={item.value}
           value={item.value}>{item.label}</option>))}
        </NativeSelect>
    </FormControl>
  );
}
export default PlayerPicker;
