import React from 'react';
import {
    useQuery,
    useQueryClient,
    useMutation,
} from '@tanstack/react-query';
import { Box, Button } from '@mui/material';
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
import { getProviders, updateProvider, createProvider, deleteProvider } from './api';




function Providers() {
    const [rows, setRows] = React.useState([]);
    const [rowModesModel, setRowModesModel] = React.useState({});

    function EditToolbar() {

        const handleClick = () => {
            const id = randomId();
            setRows((oldRows) => [...oldRows, { id, name: '', searchUrl: '', isNew: true }]);
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


    let { data, isLoading, refetch } = useQuery({
        queryKey: ['providers'],
        queryFn: getProviders,
        staleTime: Infinity, // do not refresh data
    });
    React.useEffect(() => {
        setRows(data || []);
      }, [data, setRows]);
    console.log(data);
    // const [rows, setRows] = React.useState([]);
    if (isLoading) {
        return (<h5>Loading...</h5>);
    }
    // setRows(data);

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
        console.log("Delete");
        await deleteProvider(id);
        refetch();
        // setRows(rows.filter((row) => row.id !== id));
    };

    const handleCancelClick = (id) => () => {
        setRowModesModel({
            ...rowModesModel,
            [id]: { mode: GridRowModes.View, ignoreModifications: true },
        });

        // const editedRow = rows.find((row) => row.id === id);
        // if (editedRow.isNew) {
        //   // setRows(rows.filter((row) => row.id !== id));
        // }
    };

    const processRowUpdate = async (newRow) => {
        console.log(newRow);
        // I'm assuming to determine if we should delete we need to see if it's in the rows?
        // const exists = rows.find((row) => row.id === newRow.id ? row : null);
        // if (!exists) {
        //     console.log("delete row");
        //     await deleteProvider(newRow);
        //     return;
        // }

        let updatedRow = { ...newRow, isNew: false };
        if (newRow.isNew) {
            updatedRow = await createProvider(updatedRow);
        } else {
            updatedRow = await updateProvider(updatedRow.id, updatedRow);
        }
        console.log(updatedRow);
        // we have to use the auto-generated row rather than the row from the server
        refetch();
        // setRows(rows.map((row) => (row.id === newRow.id ? updatedRow : row)));
        return updatedRow;
    };

    const processRowUpdateError = (err) => {
        // FIXME: need more robust error handling
        console.error(err);
    };


    const handleRowModesModelChange = (newRowModesModel) => {
        setRowModesModel(newRowModesModel);
    };

    const columns = [
        { field: 'name', headerName: 'Name', width: 180, editable: true },
        {
            field: 'searchUrl',
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
    return (<Box
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
    </Box>);
}
export default Providers;