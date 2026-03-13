import { Box, Divider, Fade, Slide, Stack, Typography, Button, Modal, Grid, Grow, SpeedDial, SpeedDialAction, Menu, MenuItem } from '@mui/material'
import PageSlider from './PageSlider'
import { useEffect, useState, useCallback, useRef } from 'react'
import chapterDb from '../chapterDb';
import chapterDbENG from '../chapterDbENG';
import chapterDbColored from '../chapterDbColored';
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
import PaletteIcon from '@mui/icons-material/Palette';
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

  const isOpenChapterRef = useRef(isOpenChapter);
  const isLoadingNewChaptersRef = useRef(isLoadingNewChapters);
  const chapterDataRef = useRef(chapterData);

  useEffect(() => { isOpenChapterRef.current = isOpenChapter; }, [isOpenChapter]);
  useEffect(() => { isLoadingNewChaptersRef.current = isLoadingNewChapters; }, [isLoadingNewChapters]);
  useEffect(() => { chapterDataRef.current = chapterData; }, [chapterData]);

  const [showContent, setShowContent] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showOverlayContent, setShowOverlayContent] = useState(false);
  const [pendingUpdateOnLanguageChange, setPendingUpdateOnLanguageChange] = useState(false);

  const {
    currentChapter,
    currentVolume,
    currentPage,
    lastReadChapter,
    isDescending,
    chunkSize,
    language,
    edition,
    updateCurrentChapter,
    updateChapterOrder,
    updateChunkSize,
    updateLanguage,
    updateEdition
  } = useReader();

  const languageRef = useRef(language);
  const editionRef = useRef(edition);
  const hasInitialSearchDone = useRef(false);

  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { editionRef.current = edition; }, [edition]);

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

  const getVolumeOfChapterIfExists = useCallback(async (chapterNumber) => {
    const currentChapterData = chapterDataRef.current;
    const currentLanguage = languageRef.current;
    const currentEdition = editionRef.current;

    // Se già presente nel db
    if (currentChapterData[chapterNumber]) return currentChapterData[chapterNumber];

    const knownChapters = Object.keys(currentChapterData)
      .map(Number)
      .sort((a, b) => a - b);

    // Trova il capitolo più vicino inferiore
    let estimatedStartVolume = 1;
    for (let i = knownChapters.length - 1; i >= 0; i--) {
      const knownChap = knownChapters[i];
      if (knownChap < chapterNumber) {
        estimatedStartVolume = currentChapterData[knownChap];
        break;
      }
    }

    // Cerca da estimatedStartVolume in su
    for (let volume = estimatedStartVolume; volume <= estimatedStartVolume + 3; volume++) {
      const baseUrl = currentLanguage === 'ENG'
        ? 'https://onepiecepower.com/manga8/onepiece/eng/volume'
        : currentEdition === 'COLORED'
          ? 'https://onepiecepower.com/manga8/onepiece/volumiSpeciali/volumiColored/volume'
          : 'https://onepiecepower.com/manga8/onepiece/volumi/volume';
      
      const url = `${baseUrl}${String(volume).padStart(3, '0')}/${String(chapterNumber).padStart(3, '0')}/01.jpg`;
      const exists = await checkImageExists(url);
      if (exists) {
        // aggiorna chapterData + localStorage
        const updated = { ...currentChapterData, [chapterNumber]: volume };
        setChapterData(updated);
        const localStorageKey = currentLanguage === 'ENG' ? 'chapterDBENG' : currentEdition === 'COLORED' ? 'chapterDBColored' : 'chapterDB';
        localStorage.setItem(localStorageKey, JSON.stringify(updated));
        return volume;
      }
    }

    return false;
  }, []);

  const startChapterUpdate = useCallback(async () => {
    setLastFoundChapter(null);

    // Usa il database corretto in base alla lingua/edizione
    const currentChapterData = chapterDataRef.current;
    const currentLanguage = languageRef.current;
    const currentEdition = editionRef.current;

    let lastChapterNumber = Math.max(...Object.keys(currentChapterData).map(Number));
    const newChapterData = { ...currentChapterData };

    try {
      let hasMoreChapters = true;
      let consecutiveFailures = 0;
      let maxIterations = 50; // Limite massimo per evitare loop infiniti
      let iterations = 0;

      while (hasMoreChapters && iterations < maxIterations) {
        iterations++;
        const nextChapterNumber = lastChapterNumber + 1;
        const nextVolumeNumber = await getVolumeOfChapterIfExists(nextChapterNumber);
        console.log(`Capitolo ${nextChapterNumber}: volume ${nextVolumeNumber}`);

        if (nextVolumeNumber) {
          newChapterData[nextChapterNumber] = nextVolumeNumber;
          lastChapterNumber = nextChapterNumber;
          setLastFoundChapter(nextChapterNumber);
          consecutiveFailures = 0;
        } else {
          consecutiveFailures++;
          if (consecutiveFailures >= 3) {
            hasMoreChapters = false;
          }
        }
      }

      if (Object.keys(newChapterData).length > Object.keys(currentChapterData).length) {
        setChapterData(newChapterData);
        const localStorageKey = currentLanguage === 'ENG' ? 'chapterDBENG' : currentEdition === 'COLORED' ? 'chapterDBColored' : 'chapterDB';
        localStorage.setItem(localStorageKey, JSON.stringify(newChapterData));
      }
    } catch (err) {
      console.error("Errore aggiornamento capitoli:", err);
    } finally {
      setIsLoadingNewChapters(false);
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
  }, [getVolumeOfChapterIfExists]);

  // Funzione per ottenere i nuovi capitoli
  const getRemainChapters = useCallback(async () => {
    if (isOpenChapterRef.current || isLoadingNewChaptersRef.current) return; // Non aggiornare se un capitolo è aperto o già in corso

    setIsLoadingNewChapters(true);

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
  }, [startChapterUpdate]);

  const handleLanguageToggle = () => {
    setPendingUpdateOnLanguageChange(true);

    // Se si passa a ENG, forziamo il ritorno alla versione BW (no colored)
    if (language === 'IT' && edition === 'COLORED') {
      updateEdition('BW');
    }

    updateLanguage(language === 'IT' ? 'ENG' : 'IT');
  };

  // Effetto per caricare i dati quando cambia la lingua o l'edizione
  useEffect(() => {
    setIsChapterDataLoaded(false);

    const getDbInfo = () => {
      if (language === 'ENG') return { key: 'chapterDBENG', db: chapterDbENG };
      if (edition === 'COLORED') return { key: 'chapterDBColored', db: chapterDbColored };
      return { key: 'chapterDB', db: chapterDb };
    };

    const { key, db } = getDbInfo();
    const localStorageData = localStorage.getItem(key);

    if (localStorageData) {
      setChapterData(JSON.parse(localStorageData));
    } else {
      localStorage.setItem(key, JSON.stringify(db));
      setChapterData(db);
    }
  }, [language, edition]);

  // Effetto per verificare che i dati siano stati effettivamente caricati
  useEffect(() => {
    if (Object.keys(chapterData).length > 0) {
      setIsChapterDataLoaded(true);
    }
  }, [chapterData]);

  // Effetto per l'aggiornamento automatico all'avvio
  useEffect(() => {
    if (isChapterDataLoaded && !pendingUpdateOnLanguageChange && !isOpenChapter && !hasInitialSearchDone.current) {
      getRemainChapters();
      hasInitialSearchDone.current = true;
    }
  }, [isChapterDataLoaded, pendingUpdateOnLanguageChange, isOpenChapter, getRemainChapters]);

  // Effetto per l'aggiornamento al cambio lingua o edizione
  useEffect(() => {
    if (isChapterDataLoaded && pendingUpdateOnLanguageChange && !isOpenChapter) {
      getRemainChapters();
      hasInitialSearchDone.current = true;
      setPendingUpdateOnLanguageChange(false);
    }
  }, [isChapterDataLoaded, pendingUpdateOnLanguageChange, isOpenChapter, getRemainChapters]);

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

  const RainbowPaletteIcon = (props) => (
    <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 48 48"
    {...props}
  >
    <defs>
      <linearGradient id="brightRainbow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FF3B30"/>   {/* rosso acceso */}
        <stop offset="15%" stopColor="#FF9500"/>  {/* arancio acceso */}
        <stop offset="30%" stopColor="#FFD300"/>  {/* giallo acceso */}
        <stop offset="45%" stopColor="#32D74B"/>  {/* verde acceso */}
        <stop offset="60%" stopColor="#0A84FF"/>  {/* blu acceso */}
        <stop offset="75%" stopColor="#5E5CE6"/>  {/* viola acceso */}
        <stop offset="90%" stopColor="#FF2D55"/>  {/* fucsia acceso */}
      </linearGradient>
    </defs>
    <g transform="translate(0,0) scale(1)">
      <path
        d="M28,33c9,0,18-3,18-15C46,9,37,2,27,2h-.5C13,2,2,11.8,2,24s8,22,21.5,22C29,46,31,39,26,36,25.1,35.4,25,33,28,33ZM14,21a3,3,0,1,1,3-3A2.9,2.9,0,0,1,14,21Zm7-5a3,3,0,1,1,3-3A2.9,2.9,0,0,1,21,16Zm15-2a3,3,0,1,1-3,3A2.9,2.9,0,0,1,36,14ZM29,9a3,3,0,1,1-3,3A2.9,2.9,0,0,1,29,9Z"
        fill="url(#brightRainbow)"
      />
    </g>
  </svg>
  );

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
    },
    {
      icon: edition === 'BW' ? <PaletteIcon /> : <RainbowPaletteIcon />, 
      name: `Versione (${edition === 'COLORED' ? 'Colored' : 'Bianco e nero'})`,
      action: () => {
        if (language === 'ENG') return;
        const newEdition = edition === 'BW' ? 'COLORED' : 'BW';
        setPendingUpdateOnLanguageChange(true);
        updateEdition(newEdition);
      }
    },
    {
      icon: <Box
        component="img"
        src={language === 'IT' ? 'https://flagcdn.com/w160/it.png' : 'https://flagcdn.com/w160/gb.png'}
        alt={language === 'IT' ? 'Bandiera italiana' : 'Bandiera inglese'}
        sx={{
          width: 24,
          height: 18,
          objectFit: 'cover',
          borderRadius: '2px',
          transition: 'all 0.3s ease-in-out',
          p: 0.1
        }}
      />,
      name: `Cambia lingua (${language})`,
      action: handleLanguageToggle
    }
  ];

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

          <Grid container spacing={2} sx={{ pb: 12 }}>
            {chapterGroups.map((group, index) => {
              const isLastOdd = chapterGroups.length % 2 === 1 && index === chapterGroups.length - 1;
              return (
                <Grid item xs={isLastOdd ? 12 : 6} key={`${index}-${animationKey}`}>
                  <Fade
                    in={showContent}
                    timeout={showContent ? index * 50 + 100 : 200}
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
                  </Fade>
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
        <Grow 
          in={isModalOpen} 
          timeout={300}
          style={{ transformOrigin: 'center center' }}
        >
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
                    height={window.innerHeight - 110}
                    width={'100%'}
                    itemSize={80}
                    itemCount={Object.keys(selectedGroup).length}
                    overscanCount={10}
                  >
                    {({ index, style }) => (
                      <Fade 
                        in={isModalOpen} 
                        timeout={index < 10 ? index * 100 + 1000 : 0}
                        style={{ transformOrigin: '0 0 0' }}
                      >
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
                      </Fade>
                    )}
                  </FixedSizeList>
                </Box>
                <Box sx={{ p: 2, pb: "40px", borderRadius: '0px !important', bgcolor: '#16192a', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        </Grow>
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

      <Slide direction="left" in={showContent} mountOnEnter unmountOnExit>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={handleResumeReading}
          disabled={!showContent}
          sx={{
            position: 'fixed',
            bottom: { xs: '40px', sm: 16 },
            right: 24,
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

      <Slide direction="right" in={showContent} mountOnEnter unmountOnExit>
        <SpeedDial
          ariaLabel="Menu opzioni"
          sx={{ 
            position: 'fixed', 
            bottom: { xs: '40px', sm: 16 }, 
            left: 24,
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
