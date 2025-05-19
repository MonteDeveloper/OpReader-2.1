import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  shape: {
    borderRadius: 24,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
        },
      },
    },
    MuiSpeedDial: {
      styleOverrides: {
        root: {
          '& .MuiSpeedDial-fab': {
            borderRadius: '50%',
          },
        },
      },
    },
    MuiSpeedDialAction: {
      styleOverrides: {
        fab: {
          borderRadius: '50%',
        },
      },
    },
    MuiModal: {
      styleOverrides: {
        root: {
          '& .MuiBox-root': {
            borderRadius: 24,
          },
        },
      },
    },
  },
});

export default theme; 