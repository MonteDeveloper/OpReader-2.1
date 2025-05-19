import { Box, Divider, Fade, Slide, Stack, Typography, Button, Modal, Grid, Grow, SpeedDial, SpeedDialAction, Menu, MenuItem } from '@mui/material'
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
import RefreshIcon from '@mui/icons-material/Refresh';
import { useReader } from '../context/ReaderContext';

function HomeChapters() {
  const [isOpenChapter, setIsOpenChapter] = useState(false);
  const [chapterData, setChapterData] = useState([]);
  const [isChapterDataLoaded, setIsChapterDataLoaded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [chunkSizeMenuAnchor, setChunkSizeMenuAnchor] = useState(null);
  const [isLoadingNewChapters, setIsLoadingNewChapters] = useState(false);
  const [lastFoundChapter, setLastFoundChapter] = useState(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [showContent, setShowContent] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showOverlayContent, setShowOverlayContent] = useState(false);

  const {
    currentChapter,
    currentVolume,
    currentPage,
    lastReadChapter,
    isDescending,
    chunkSize,
    updateCurrentChapter,
    updateChapterOrder,
    updateChunkSize
  } = useReader();

  const [chapterGroups, setChapterGroups] = useState([]);

  // Funzione per verificare se un'immagine esiste
  const checkImageExists = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  };

  const getVolumeOfChapterIfExists = async (chapterNumber) => {
    // Se già presente nel db
    if (chapterData[chapterNumber]) return chapterData[chapterNumber];

    const knownChapters = Object.keys(chapterData)
      .map(Number)
      .sort((a, b) => a - b);

    // Trova il capitolo più vicino inferiore
    let estimatedStartVolume = 1;
    for (let i = knownChapters.length - 1; i >= 0; i--) {
      const knownChap = knownChapters[i];
      if (knownChap < chapterNumber) {
        estimatedStartVolume = chapterData[knownChap];
        break;
      }
    }

    // Cerca da estimatedStartVolume in su
    for (let volume = estimatedStartVolume; volume <= estimatedStartVolume + 10; volume++) {
      const url = `https://onepiecepower.com/manga8/onepiece/volumi/volume${String(volume).padStart(3, '0')}/${String(chapterNumber).padStart(3, '0')}/01.jpg`;
      const exists = await checkImageExists(url);
      if (exists) {
        // aggiorna chapterData + localStorage
        const updated = { ...chapterData, [chapterNumber]: volume };
        setChapterData(updated);
        localStorage.setItem('chapterDB', JSON.stringify(updated));
        return volume;
      }
    }

    return false;
  };

  // Funzione per ottenere i nuovi capitoli
  const getRemainChapters = async () => {
    // Prima nascondi il contenuto
    setShowContent(false);

    // Dopo 200ms (durata dell'animazione Grow), mostra l'overlay
    setTimeout(() => {
      setShowOverlay(true);
      // Dopo che l'overlay è visibile, mostra il suo contenuto
      setTimeout(() => {
        setShowOverlayContent(true);
        // Ora inizia l'effettivo aggiornamento
        startChapterUpdate();
      }, 100);
    }, 200);
  };

  const startChapterUpdate = async () => {
    setLastFoundChapter(null);

    let lastChapterNumber = Math.max(...Object.keys(chapterData).map(Number));
    const newChapterData = { ...chapterData };

    try {
      while (true) {
        const nextChapterNumber = lastChapterNumber + 1;
        const nextVolumeNumber = await getVolumeOfChapterIfExists(nextChapterNumber);
        console.log(`Capitolo ${nextChapterNumber}: volume ${nextVolumeNumber}`);

        if (nextVolumeNumber) {
          newChapterData[nextChapterNumber] = nextVolumeNumber;
          lastChapterNumber = nextChapterNumber;
          setLastFoundChapter(nextChapterNumber);
        } else {
          break;
        }
      }

      if (Object.keys(newChapterData).length > Object.keys(chapterData).length) {
        setChapterData(newChapterData);
        localStorage.setItem('chapterDB', JSON.stringify(newChapterData));
      }
    } catch (err) {
      console.error("Errore aggiornamento capitoli:", err);
    } finally {
      // Nascondi prima il contenuto dell'overlay
      setShowOverlayContent(false);
      // Dopo 100ms nascondi l'overlay
      setTimeout(() => {
        setShowOverlay(false);
        // Dopo che l'overlay è nascosto, mostra di nuovo il contenuto
        setTimeout(() => {
          setShowContent(true);
          setAnimationKey(prev => prev + 1);
        }, 200);
      }, 100);
    }
  };

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

  // Avvia automaticamente l'aggiornamento dei capitoli dopo il caricamento iniziale
  useEffect(() => {
    if (isChapterDataLoaded) {
      getRemainChapters();
    }
  }, [isChapterDataLoaded]);

  // Aggiorna i gruppi quando cambia l'ordine o il chunkSize
  useEffect(() => {
    if (isChapterDataLoaded) {
      const groups = splitObjectIntoGroups(chapterData, chunkSize);
      setChapterGroups(isDescending ? groups.reverse() : groups);
    }
  }, [isDescending, chunkSize, isChapterDataLoaded, chapterData]);

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

  function openChapter(chapter, volume, page = 1) {
    updateCurrentChapter(chapter, volume, page);
    setIsOpenChapter(true);
    setIsModalOpen(false);
  }

  function goNextChap() {
    if (chapterData[Number(currentChapter) + 1]) {
      updateCurrentChapter(Number(currentChapter) + 1, chapterData[Number(currentChapter) + 1]);
    }
  }

  function goPrevChap() {
    if (Number(currentChapter) - 1 > 0) {
      updateCurrentChapter(Number(currentChapter) - 1, chapterData[Number(currentChapter) - 1]);
    }
  }

  const handleOrderChange = () => {
    updateChapterOrder(!isDescending);
    setAnimationKey(prev => prev + 1);
  };

  const handleChunkSizeChange = (size) => {
    updateChunkSize(size);
    setChunkSizeMenuAnchor(null);
    setAnimationKey(prev => prev + 1);
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
    },
    {
      icon: <RefreshIcon sx={{
        animation: isLoadingNewChapters ? 'spin 1s linear infinite' : 'none',
        '@keyframes spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      }} />,
      name: 'Aggiorna capitoli',
      action: getRemainChapters
    }
  ];

  const handleResumeReading = () => {
    if (lastReadChapter) {
      openChapter(lastReadChapter.chapter, lastReadChapter.volume, lastReadChapter.page);
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
          <Fade in={showOverlay} timeout={200}>
            <Stack
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                bgcolor: '#16192a',
                zIndex: 99999,
                spacing: 1,
                p: 2,
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'all',
              }}
            >
              <Grow in={showOverlayContent} timeout={200}>
                <Stack spacing={2} alignItems="center">
                  <span className="loader"></span>
                  <Typography color="white" variant="subtitle2">
                    Ricerca nuovi capitoli...
                  </Typography>
                  {lastFoundChapter && (
                    <Typography color="white" variant="subtitle2">
                      Ultimo trovato: {lastFoundChapter}
                    </Typography>
                  )}
                </Stack>
              </Grow>
            </Stack>
          </Fade>

          <Grid container spacing={2}>
            {chapterGroups.map((group, index) => {
              const isLastOdd = chapterGroups.length % 2 === 1 && index === chapterGroups.length - 1;
              return (
                <Grid item xs={isLastOdd ? 12 : 6} key={`${index}-${animationKey}`}>
                  <Grow
                    in={showContent}
                    timeout={showContent ? index * 50 + 100 : 200}
                    style={{ transformOrigin: '0 0 0' }}
                  >
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
                    height={window.innerHeight - 80}
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
            key={currentChapter}
            isLastChap={Object.keys(chapterData)[Object.keys(chapterData).length - 1] == Number(currentChapter)}
            prevChap={goPrevChap}
            nextChap={goNextChap}
            volume={String(currentVolume).padStart(3, '0')}
            chapter={String(currentChapter).padStart(3, '0')}
            closeChapter={() => setIsOpenChapter(false)}
            initialPage={currentPage}
          />
        </Box>
      </Slide>

      <Slide direction="right" in={showContent} mountOnEnter unmountOnExit>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={handleResumeReading}
          disabled={!showContent}
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
      </Slide>

      <Slide direction="left" in={showContent} mountOnEnter unmountOnExit>
        <SpeedDial
          ariaLabel="Menu opzioni"
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            pointerEvents: showContent ? 'auto' : 'none'
          }}
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
          disabled={!showContent}
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
        </SpeedDial>
      </Slide>

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
