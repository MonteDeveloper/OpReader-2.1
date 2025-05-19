import { Box, Divider, Fade, Slide, Stack, Typography, Button, Modal, Grid, Grow, SpeedDial, SpeedDialAction, SpeedDialIcon, Menu, MenuItem } from '@mui/material'
import PageSlider from './PageSlider'
import { useEffect, useState } from 'react'
import chapterDb from '../chapterDb';
import { FixedSizeList } from 'react-window';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import SettingsIcon from '@mui/icons-material/Settings';
import SortIcon from '@mui/icons-material/Sort';
import Filter1Icon from '@mui/icons-material/Filter1';
import Filter2Icon from '@mui/icons-material/Filter2';
import Filter3Icon from '@mui/icons-material/Filter3';
import Filter5Icon from '@mui/icons-material/Filter5';
import Filter9PlusIcon from '@mui/icons-material/Filter9Plus';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

function HomeChapters() {
  const [isOpenChapter, setIsOpenChapter] = useState(false);
  const [chapterData, setChapterData] = useState([]);
  const [chapterReading, setChapterReading] = useState(1);
  const [volumeReading, setVolumeReading] = useState(1);
  const [isChapterDataLoaded, setIsChapterDataLoaded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDescending, setIsDescending] = useState(true);
  const [chunkSize, setChunkSize] = useState(50);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [chunkSizeMenuAnchor, setChunkSizeMenuAnchor] = useState(null);
  const [lastReadChapter, setLastReadChapter] = useState(null);

  const [chapterGroups, setChapterGroups] = useState([]);

  // Leggi le preferenze da localStorage all'avvio
  useEffect(() => {
    const savedOrder = localStorage.getItem('chapterOrder');
    const savedChunkSize = localStorage.getItem('chapterChunkSize');
    const savedLastChapter = localStorage.getItem('lastReadChapter');

    if (savedOrder !== null) {
      setIsDescending(JSON.parse(savedOrder));
    }
    if (savedChunkSize !== null) {
      setChunkSize(JSON.parse(savedChunkSize));
    }
    if (savedLastChapter !== null) {
      setLastReadChapter(JSON.parse(savedLastChapter));
    }
  }, []);

  // Aggiorna i gruppi quando cambia l'ordine o il chunkSize
  useEffect(() => {
    if (isChapterDataLoaded) {
      const groups = splitObjectIntoGroups(chapterData, chunkSize);
      setChapterGroups(isDescending ? groups.reverse() : groups);
    }
  }, [isDescending, chunkSize, isChapterDataLoaded, chapterData]);

  useEffect(() => {
    // Controlla se esiste un valore salvato in localStorage
    const localStorageData = localStorage.getItem('chapterDB');

    if (localStorageData) {
      // Se esiste un valore, lo carica inizialmente nello stato
      setChapterData(JSON.parse(localStorageData));
    } else {
      // Altrimenti, carica i dati da chapterDb.js e li salva in localStorage
      const dataFromDb = chapterDb;
      localStorage.setItem('chapterDB', JSON.stringify(dataFromDb)); // Salva i dati in localStorage
      setChapterData(dataFromDb); // Imposta i dati nello stato
    }
    setIsChapterDataLoaded(true);
  }, []);

  function splitObjectIntoGroups(object, groupSize) {
    const keys = Object.keys(object);
    const groups = [];
    for (let i = 0; i < keys.length; i += groupSize) {
      const group = {};
      for (let j = i; j < Math.min(i + groupSize, keys.length); j++) {
        const key = keys[j];
        group[key] = object[key];
      }
      groups.push(group);
    }
    return groups;
  }

  function openChapter(chapter, volume) {
    setChapterReading(String(chapter).padStart(3, '0'));
    setVolumeReading(String(volume).padStart(3, '0'));
    setIsOpenChapter(true);
    setIsModalOpen(false);
    // Aggiorna sia lo stato che il localStorage
    const newLastRead = { chapter, volume };
    setLastReadChapter(newLastRead);
    localStorage.setItem('lastReadChapter', JSON.stringify(newLastRead));
  }

  function goNextChap() {
    if (chapterData[Number(chapterReading) + 1]) {
      setChapterReading(String(Number(chapterReading) + 1).padStart(3, '0'));
      setVolumeReading(String(chapterData[Number(chapterReading) + 1]).padStart(3, '0'));
    }
  }

  function goPrevChap() {
    if (Number(chapterReading) - 1 > 0) {
      setChapterReading(String(Number(chapterReading) - 1).padStart(3, '0'));
      setVolumeReading(String(chapterData[Number(chapterReading) - 1]).padStart(3, '0'));
    }
  }

  const handleOrderChange = () => {
    const newOrder = !isDescending;
    setIsDescending(newOrder);
    localStorage.setItem('chapterOrder', JSON.stringify(newOrder));
  };

  const handleChunkSizeChange = (size) => {
    setChunkSize(size);
    localStorage.setItem('chapterChunkSize', JSON.stringify(size));
    setChunkSizeMenuAnchor(null);
  };

  const getChunkSizeIcon = (size) => {
    switch (size) {
      case 10: return <Filter1Icon />;
      case 20: return <Filter2Icon />;
      case 30: return <Filter3Icon />;
      case 50: return <Filter5Icon />;
      case 100: return <Filter9PlusIcon />;
      default: return <Filter5Icon />;
    }
  };

  const speedDialActions = [
    {
      icon: <SortIcon sx={{
        transform: !isDescending ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.3s ease-in-out'
      }} />,
      name: 'Inverti ordine',
      action: handleOrderChange
    },
    {
      icon: getChunkSizeIcon(chunkSize),
      name: 'Capitoli per gruppo',
      action: (e) => setChunkSizeMenuAnchor(e.currentTarget)
    }
  ];

  const handleResumeReading = () => {
    if (lastReadChapter) {
      openChapter(lastReadChapter.chapter, lastReadChapter.volume);
    } else {
      // Se non c'è un capitolo salvato, apri l'ultimo disponibile
      const lastChapter = Object.keys(chapterData).pop();
      const lastVolume = chapterData[lastChapter];
      openChapter(lastChapter, lastVolume);
    }
  };

  return (
    <>
      <Fade in={isChapterDataLoaded} unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100dvh',
            width: '100%',
            overflow: 'auto',
            p: 2
          }}
        >
          <Grid container spacing={2}>
            {chapterGroups.map((group, index) => {
              const isLastOdd = chapterGroups.length % 2 === 1 && index === chapterGroups.length - 1;
              return (
                <Grid item xs={isLastOdd ? 12 : 6} key={index}>
                  <Grow in={true} timeout={500} style={{ transformOrigin: '0 0 0' }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => {
                        setSelectedGroup(group);
                        setIsModalOpen(true);
                      }}
                      sx={{
                        height: '80px',
                        color: 'white',
                        bgcolor: '#1d2136',
                        border: 'none',
                        '&:hover': {
                          border: 'none',
                          bgcolor: '#1d2136',
                        }
                      }}
                    >
                      <Typography>
                        {Object.keys(group)[0]} - {Object.keys(group)[Object.keys(group).length - 1]}
                      </Typography>
                    </Button>
                  </Grow>
                </Grid>
              );
            })}
          </Grid>

        </Box>
      </Fade>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          borderRadius: '0px !important',
        }}
      >
        <Fade in={isModalOpen}>
          <Box
            sx={{
              bgcolor: '#1d2136',
              width: '100%',
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'auto',
          borderRadius: '0px !important',
          WebkitOverflowScrolling: 'touch',
            }}
          >
            {selectedGroup && (
              <>
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  <FixedSizeList
                    height={window.innerHeight - 80} // Altezza totale meno spazio per il bottone chiudi
                    width={'100%'}
                    itemSize={80}
                    itemCount={Object.keys(selectedGroup).length}
                    overscanCount={10}
                  >
                    {({ index, style }) => (
                      <Stack style={style}>
                        <ListItemButton
                          sx={{ display: 'flex', justifyContent: 'center' }}
                          onClick={() => openChapter(
                            Object.keys(selectedGroup)[index],
                            Object.values(selectedGroup)[index]
                          )}
                        >
                          <ListItemText
                            primaryTypographyProps={{ sx: { color: 'white' } }}
                            secondaryTypographyProps={{ sx: { color: 'white', opacity: .3 } }}
                            sx={{ textAlign: 'center' }}
                            primary={`CAPITOLO ${Object.keys(selectedGroup)[index]}`}
                            secondary={`VOLUME ${Object.values(selectedGroup)[index]}`}
                          />
                        </ListItemButton>
                        <Divider sx={{ backgroundColor: 'white', opacity: .1 }} />
                      </Stack> 
                    )}
                  </FixedSizeList>
                </Box>
                <Box sx={{ borderRadius: '0px !important', bgcolor: '#16192a', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onTouchStart={() => setIsModalOpen(false)}
                    onClick={() => setIsModalOpen(false)}
                    sx={{
                      height: '100%',
                      color: 'white',
                      bgcolor: '#1d2136',
                      border: 'none',
                      '&:hover': {
                        border: 'none',
                        bgcolor: '#1d2136',
                      }
                    }}
                  >
                    Chiudi
                  </Button>
                </Box>

              </>
            )}
          </Box>
        </Fade>
      </Modal>

      <Slide direction='left' in={isOpenChapter} unmountOnExit>
        <Box className={'z-index-primary'}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100dvh',
            width: '100%',
          }}
        >
          <PageSlider
            key={chapterReading}
            isLastChap={Object.keys(chapterData)[Object.keys(chapterData).length - 1] == Number(chapterReading)}
            prevChap={goPrevChap}
            nextChap={goNextChap}
            volume={volumeReading}
            chapter={chapterReading}
            closeChapter={() => setIsOpenChapter(false)}
          />
        </Box>
      </Slide>

      <Button
        variant="contained"
        startIcon={<PlayArrowIcon />}
        onClick={handleResumeReading}
        sx={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          bgcolor: 'white',
          color: '#1d2136',
          py: 2,
          '&:hover': {
            bgcolor: 'white',
          },
        }}
      >
        Riprendi {lastReadChapter ? `#${lastReadChapter.chapter}` : ''}
      </Button>

      <SpeedDial
        ariaLabel="Menu opzioni"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={
          <SettingsIcon
            sx={{
              transform: isSpeedDialOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease-in-out'
            }}
          />
        }
        onClose={() => setIsSpeedDialOpen(false)}
        onOpen={() => setIsSpeedDialOpen(true)}
        open={isSpeedDialOpen}
        FabProps={{
          sx: {
            bgcolor: 'white',
            color: '#1d2136',
            '&:hover': {
              bgcolor: 'white',
            },
          },
        }}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.action}
          />
        ))}
      </SpeedDial >

      <Menu
        anchorEl={chunkSizeMenuAnchor}
        open={Boolean(chunkSizeMenuAnchor)}
        onClose={() => setChunkSizeMenuAnchor(null)}
      >
        {[10, 20, 50, 100].map((size) => (
          <MenuItem
            key={size}
            onClick={() => handleChunkSizeChange(size)}
            selected={size === chunkSize}
          >
            {size} capitoli
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

export default HomeChapters
