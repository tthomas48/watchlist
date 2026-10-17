import { useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Autocomplete, Avatar, Chip, TextField, createFilterOptions,
} from '@mui/material';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';
import { personAvatarSrc, personInitials } from './personAvatar';

const peopleFilter = createFilterOptions();

/**
 * Multi-select people with quick-add by name.
 * @param {{ value: object[], onChange: (next: object[]) => void, label?: string, disabled?: boolean }} props
 */
function PeopleMultiSelect({
  value, onChange, label = 'Recommended by', disabled = false,
}) {
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const queryClient = useQueryClient();

  const peopleQuery = useQuery({
    queryKey: ['people'],
    queryFn: async () => api.getPeople(),
    staleTime: 60_000,
  });

  return (
    <Autocomplete
      multiple
      disabled={disabled}
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
      options={peopleQuery.data || []}
      value={value || []}
      filterOptions={(options, params) => {
        const filtered = peopleFilter(options, params);
        const input = params.inputValue.trim();
        if (!input) return filtered;
        const exists = options.some(
          (opt) => (opt.name || '').toLowerCase() === input.toLowerCase(),
        );
        if (!exists) {
          filtered.push({
            inputValue: input,
            name: `Add "${input}"`,
            id: `__new__${input}`,
            isNew: true,
          });
        }
        return filtered;
      }}
      onChange={async (_e, next) => {
        const pending = next.filter((p) => p?.isNew);
        const kept = next.filter((p) => p && !p.isNew);
        if (!pending.length) {
          onChange(kept);
          return;
        }
        try {
          const createdList = [];
          for (const p of pending) {
            const name = p.inputValue || p.name;
            // eslint-disable-next-line no-await-in-loop
            const created = await api.createPerson({ name });
            createdList.push(created);
          }
          queryClient.invalidateQueries({ queryKey: ['people'] });
          const byId = new Map();
          [...kept, ...createdList].forEach((p) => {
            if (p?.id != null) byId.set(p.id, p);
          });
          onChange([...byId.values()]);
        } catch (e) {
          messageContext.sendMessage({
            message: e.message,
            severity: 'error',
            open: true,
          });
          onChange(kept);
        }
      }}
      getOptionLabel={(opt) => {
        if (typeof opt === 'string') return opt;
        if (opt.isNew) return opt.inputValue || '';
        return opt.name || '';
      }}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          {option.isNew ? option.name : option.name}
        </li>
      )}
      renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => {
        const src = personAvatarSrc(option);
        return (
          <Chip
            {...getTagProps({ index })}
            key={option.id}
            size="small"
            avatar={(
              <Avatar src={src || undefined} alt="">
                {!src ? personInitials(option.name) : null}
              </Avatar>
            )}
            label={option.name}
          />
        );
      })}
      renderInput={(params) => (
        <TextField {...params} variant="standard" label={label} />
      )}
    />
  );
}

export default PeopleMultiSelect;
