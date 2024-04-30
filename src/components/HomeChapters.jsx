import { Box, Button, Divider, Fade, List, Slide, Stack, Typography } from '@mui/material'
import PageSlider from './PageSlider'
import { TransitionGroup } from 'react-transition-group';
import Collapse from '@mui/material/Collapse';
import { useEffect, useState } from 'react'
import chapterDb from '../chapterDb';
import { FixedSizeList } from 'react-window';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';

function HomeChapters() {
    const [isOpenChapter, setIsOpenChapter] = useState(false);
    const [chapterData, setChapterData] = useState([]);
    const [chapterReading, setChapterReading] = useState(1);
    const [volumeReading, setVolumeReading] = useState(1);
    const [isLoadingNewChapters, setIsLoadingNewChapters] = useState(false);
    const [isChapterDataLoaded, setIsChapterDataLoaded] = useState(false);

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

    useEffect(() => {
        if (isChapterDataLoaded) {
            getRemainChapters();
        }
    }, [isChapterDataLoaded]);

    function openChapter(chapter, volume) {
        setChapterReading(String(chapter).padStart(3, '0'));
        setVolumeReading(String(volume).padStart(3, '0'));
        setIsOpenChapter(true);
    }

    async function getVolumeOfChapterIfExists(chapterNumber) {
        return new Promise(async (resolve, reject) => {
            try {
                const initialImgPath = 'https://onepiecepower.com/manga8/onepiece/volumi';
                if (chapterData[chapterNumber]) {
                    resolve(chapterData[chapterNumber]);
                }
                let startVolumeNumber = chapterData[Object.keys(chapterData).length];
                if (startVolumeNumber <= 0) {
                    startVolumeNumber = 1;
                }
                let endVolumeNumber = startVolumeNumber + 1;
                let errorCount = 0;
                for (let volumeNumber = startVolumeNumber; volumeNumber <= endVolumeNumber; volumeNumber++) {
                    const url = `${initialImgPath}/volume${volumeNumber}/${chapterNumber}/01.jpg`;
                    console.log(url)
                    let img = new Image();
                    img.onload = () => resolve(volumeNumber);
                    img.onerror = () => {
                        errorCount++;
                        if (errorCount >= 2) {
                            resolve(false)
                        }
                    };
                    img.src = url;
                }
            } catch (error) {
                reject('An error occurred:', error);
            }
        });
    }

    async function getRemainChapters() {
        // Ottieni l'ultimo capitolo da allChapters
        let lastChapterNumber = Object.keys(chapterData).length;
        setIsLoadingNewChapters(true);
        while (true) {
            // Ottieni il numero del prossimo capitolo
            const nextChapterNumber = lastChapterNumber + 1;
            // Controlla se il prossimo capitolo esiste
            const nextVolumeNumber = await getVolumeOfChapterIfExists(nextChapterNumber);
            console.log(nextVolumeNumber);

            if (nextVolumeNumber) {
                // Se il prossimo capitolo esiste, aggiungilo a allChapters
                chapterData[nextChapterNumber] = nextVolumeNumber;
                lastChapterNumber = nextChapterNumber;
            } else {
                // Se il prossimo capitolo non esiste, interrompi il ciclo
                setIsLoadingNewChapters(false);
                break;
            }
        }
        localStorage.setItem('chapterDB', JSON.stringify(chapterData));
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

    return (
        <>
            <Fade in={isLoadingNewChapters} unmountOnExit>
                <Stack spacing={5} justifyContent={'center'} alignItems={'center'} textAlign={'center'} height={'100dvh'}>
                    <span className='loader'></span>
                    <Typography variant='subtitle2' fontSize={12}>AGGIORNAMENTO CAPITOLI DISPONIBILI</Typography>
                </Stack>
            </Fade>
            <Fade in={chapterData && !isLoadingNewChapters} unmountOnExit>
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        height: '100dvh',
                        width: '100%',
                    }}
                >
                    <FixedSizeList
                        height={1000}
                        width={'100%'}
                        itemSize={80}
                        itemCount={Object.keys(chapterData).length}
                        overscanCount={10}
                    >
                        {({ index, style }) => (
                            <Stack style={style}>
                                <ListItemButton sx={{ display: 'flex', justifyContent: 'center' }} onClick={() => openChapter(Object.keys(chapterData).reverse()[index], Object.values(chapterData).reverse()[index])}>
                                    <ListItemText secondaryTypographyProps={{ sx: { color: 'white', opacity: .3 } }} sx={{ textAlign: 'center' }} primary={`CAPITOLO ${Object.keys(chapterData).reverse()[index]}`} secondary={`VOLUME ${Object.values(chapterData).reverse()[index]}`} />
                                </ListItemButton>
                                <Divider sx={{ backgroundColor: 'white', opacity: .1 }} />
                            </Stack>
                        )}
                    </FixedSizeList>


                </Box>
            </Fade>
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
                    <PageSlider key={chapterReading} isLastChap={Object.keys(chapterData)[Object.keys(chapterData).length - 1] == Number(chapterReading)} prevChap={goPrevChap} nextChap={goNextChap} volume={volumeReading} chapter={chapterReading} closeChapter={() => setIsOpenChapter(false)} />
                </Box>
            </Slide>
        </>
    )
}

export default HomeChapters
