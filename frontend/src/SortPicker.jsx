import {
  FormControl, InputLabel, NativeSelect,
} from '@mui/material';

function SortPicker({ sort, setSort }) {
  const options = [
    { label: 'Least Recently Watched', value: 'least-watched' },
    { label: 'Recently Watched', value: 'most-watched' },
    { label: 'A-Z', value: 'alpha-asc' },
    { label: 'Z-A', value: 'alpha-desc' },
  ];
  return (
    <FormControl fullWidth>
      <InputLabel variant="standard" htmlFor="uncontrolled-native" shrink>
        Sort
      </InputLabel>
      <NativeSelect value={sort} onChange={(e) => setSort(e.target.value)}>
        {options.map((item) => (<option key={item.value} value={item.value}>{item.label}</option>))}
      </NativeSelect>
    </FormControl>
  );
}
export default SortPicker;
