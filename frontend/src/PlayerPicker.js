import { isAndroid, isBrowser } from 'react-device-detect';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { NativeSelect } from '@mui/material';


function PlayerPicker({ setPlayer, player }) {

    var options = [];
    if (isBrowser) {
        options.push({ label: "Browser", value: "browser" });
    }
    if (isAndroid) {
        options.push({ label: "Android", value: "android" });
    }
    var isADBSupported = true;
    if (isADBSupported) {
        options.push({ label: "GoogleTV", value: "googletv" });
    }
    return (
        <FormControl fullWidth>
            <InputLabel variant="standard" htmlFor="uncontrolled-native">
                Player
            </InputLabel>
            <NativeSelect value={player} onChange={(e) => setPlayer(e.target.value)}>
                {options.map(item => {
                    return (<option key={item.value} value={item.value}>{item.label}</option>);
                })}
            </NativeSelect>
        </FormControl>
    );
}
export default PlayerPicker;