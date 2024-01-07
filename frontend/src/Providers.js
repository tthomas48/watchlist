import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useQuery,
} from '@tanstack/react-query';
import { Box, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  GridRowModes,
  DataGrid,
  GridToolbarContainer,
  GridActionsCellItem,
  GridRowEditStopReasons,
} from '@mui/x-data-grid';
import {
  randomId,
} from '@mui/x-data-grid-generator';
import { MessageContext } from './context/MessageContext';
import Api from './service/api';

function Providers() {
  const messageContext = React.useContext(MessageContext);
  const api = new Api(messageContext);
  const navigate = useNavigate();
  const [rows, setRows] = React.useState([]);
  const [rowModesModel, setRowModesModel] = React.useState({});

  function EditToolbar() {
    const handleClick = () => {
      const id = randomId();
      setRows((oldRows) => [...oldRows, {
        id, name: '', url: '', isNew: true,
      }]);
      setRowModesModel((oldModel) => ({
        ...oldModel,
        [id]: { mode: GridRowModes.Edit, fieldToFocus: 'name' },
      }));
    };

    return (
      <GridToolbarContainer>
        <Button color="primary" startIcon={<AddIcon />} onClick={handleClick}>
          Add Provider
        </Button>
      </GridToolbarContainer>
    );
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => api.getProviders(),
    staleTime: Infinity, // do not refresh data
  });
  React.useEffect(() => {
    setRows(data || []);
  }, [data, setRows]);
  if (isLoading) {
    return (<h5>Loading...</h5>);
  }

  const handleRowEditStop = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleEditClick = (id) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleDeleteClick = (id) => async () => {
    await api.deleteProvider(id);
    refetch();
  };

  const handleCancelClick = (id) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });
  };

  const processRowUpdate = async (newRow) => {
    let updatedRow = { ...newRow, isNew: false };
    if (newRow.isNew) {
      updatedRow = await api.createProvider(updatedRow);
    } else {
      updatedRow = await api.updateProvider(updatedRow.id, updatedRow);
    }
    // we have to use the auto-generated row rather than the row from the server
    refetch();
    return updatedRow;
  };

  const processRowUpdateError = (err) => {
    messageContext.sendMessage({
      message: err,
      severity: 'error',
      open: true,
    });
  };

  const handleRowModesModelChange = (newRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const columns = [
    {
      field: 'name', headerName: 'Name', width: 180, editable: true,
    },
    {
      field: 'url',
      headerName: 'Search URL',
      type: 'string',
      width: 360,
      editable: true,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

        if (isInEditMode) {
          return [
            <GridActionsCellItem
              icon={<SaveIcon />}
              label="Save"
              sx={{
                color: 'primary.main',
              }}
              onClick={handleSaveClick(id)}
            />,
            <GridActionsCellItem
              icon={<CancelIcon />}
              label="Cancel"
              className="textPrimary"
              onClick={handleCancelClick(id)}
              color="inherit"
            />,
          ];
        }

        return [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            className="textPrimary"
            onClick={handleEditClick(id)}
            color="inherit"
          />,
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="Delete"
            onClick={handleDeleteClick(id)}
            color="inherit"
          />,
        ];
      },
    },
  ];
  return (
        <Stack direction="column"
            justifyContent="center"
            alignItems="center"
            spacing={1}>
            <Box
                sx={{
                  height: 500,
                  width: '100%',
                  '& .actions': {
                    color: 'text.secondary',
                  },
                  '& .textPrimary': {
                    color: 'text.primary',
                  },
                }}
            >
              <DataGrid
                autoPageSize
                rows={rows}
                columns={columns}
                editMode="row"
                rowModesModel={rowModesModel}
                onRowModesModelChange={handleRowModesModelChange}
                onRowEditStop={handleRowEditStop}
                processRowUpdate={processRowUpdate}
                processRowUpdateError={processRowUpdateError}
                slots={{
                  toolbar: EditToolbar,
                }}
                slotProps={{
                  toolbar: { setRowModesModel },
                }}
              />
            </Box>
            <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={1}
            >
                <Button variant="outlined" onClick={() => navigate('/')}>Return</Button>
            </Stack>
        </Stack>);
}
export default Providers;
