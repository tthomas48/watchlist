import { useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Box,
  Button,
  Chip,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import BrowseFilterDialog from './BrowseFilterDialog';
import {
  activeFilterChips,
  clearBrowseFacets,
  countActiveBrowseFilters,
  hasActiveBrowseFilters,
} from './browseFilters';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';

function BrowseFilterSummary({ filters, setFilters }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const messageContext = useContext(MessageContext);
  const api = new Api(messageContext);
  const peopleQuery = useQuery({
    queryKey: ['people'],
    queryFn: async () => api.getPeople(),
    staleTime: 60_000,
    enabled: Boolean(filters?.personId),
  });
  const chips = activeFilterChips(filters, peopleQuery.data || []);
  const activeCount = countActiveBrowseFilters(filters);

  const clearFacet = (key) => {
    setFilters({ ...filters, [key]: '' });
  };

  const clearAll = () => {
    setFilters(clearBrowseFacets(filters));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        flex: 1,
        minWidth: 0,
      }}
    >
      <Badge
        badgeContent={activeCount}
        color="primary"
        invisible={activeCount === 0}
        sx={{ '& .MuiBadge-badge': { right: 4, top: 4 } }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<FilterListIcon />}
          onClick={() => setDialogOpen(true)}
          aria-label="open filters"
        >
          Filter
        </Button>
      </Badge>

      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          size="small"
          onDelete={() => clearFacet(chip.key)}
        />
      ))}

      {hasActiveBrowseFilters(filters) && (
        <Chip
          label="Clear all"
          size="small"
          variant="outlined"
          onClick={clearAll}
          onDelete={clearAll}
        />
      )}

      <BrowseFilterDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        filters={filters}
        setFilters={setFilters}
      />
    </Box>
  );
}

export default BrowseFilterSummary;
