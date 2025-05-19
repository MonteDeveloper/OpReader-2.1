import { useEffect, useState, useRef } from 'react'
import { A11y, Zoom } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import PropTypes from 'prop-types';
import { useReader } from '../context/ReaderContext';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import { Box, Button, Stack, Typography, Fade } from '@mui/material';

function PageSlider({ volume, chapter, closeChapter, nextChap, prevChap, isLastChap, initialPage = 1 }) {
    const imageLinkTemplate = `https://onepiecepower.com/manga8/onepiece/volumi/volume${String(volume).padStart(3, '0')}/${String(chapter).padStart(3, '0')}/`; // aggiungi page.jpg

    const [loading, setLoading] = useState(true);
    const [pages, setPages] = useState([]);
    const isUnmountedRef = useRef(false);
    const { updateCurrentPage } = useReader();
    const swiperRef = useRef(null);

    function checkImageExists(imageUrl) {
        return new Promise((resolve) => {
            try {
                setLoading(true);
                const img = new Image();
                console.log(imageUrl)
                img.onload = () => {
                    resolve(true)
                };
                img.onerror = () => {
                    setLoading(false);
                    resolve(false)
                };
                img.src = imageUrl;
            } catch (error) {
                console.error('Errore durante il caricamento dell\'immagine:', error);
                setLoading(false);
            }
        })
    }

    async function addRemainsPagesToChapter() {
        setLoading(true);
        let pageNum = pages.length;
        while (!isUnmountedRef.current) {
            pageNum += 1;
            // Crea l'URL dell'immagine
            let imgNumber = String(pageNum).padStart(2, '0');
            let imgUrl = `${imageLinkTemplate}${imgNumber}.jpg`;

            // Controlla se l'immagine esiste
            let imageExists = await checkImageExists(imgUrl);
            if (imageExists) {
                // Se l'immagine esiste, aggiungila solo se non è già presente
                setPages(prevUrls => {
                    if (!prevUrls.includes(imgUrl)) {
                        return [...prevUrls, imgUrl];
                    }
                    return prevUrls;
                });
                setLoadingImg(prevLoadings => [...prevLoadings, true]);
            } else {
                // Se l'immagine non esiste, interrompi il ciclo
                setLoading(false);
                break;
            }
        }
    }

    // Inizializza le pagine solo quando cambia il capitolo
    useEffect(() => {
        isUnmountedRef.current = false;
        
        // Inizializza le pagine
        const initialPages = [];
        const startPage = 1;
        const endPage = initialPage === 1 ? 6 : initialPage;
        
        for (let i = startPage; i <= endPage; i++) {
            const imgNumber = String(i).padStart(2, '0');
            initialPages.push(`${imageLinkTemplate}${imgNumber}.jpg`);
        }
        setPages(initialPages);
        setLoadingImg(new Array(endPage).fill(true));
        
        // Poi carica le pagine successive
        addRemainsPagesToChapter();
        
        return () => {
            isUnmountedRef.current = true;
        };
    }, [imageLinkTemplate]);

    // Aggiorna la posizione dello Swiper quando le pagine sono caricate
    useEffect(() => {
        if (swiperRef.current && pages.length > 0) {
            swiperRef.current.slideTo(initialPage - 1, 0);
        }
    }, [pages, initialPage]);

    const [loadingImg, setLoadingImg] = useState(new Array(pages.length).fill(true));

    // Funzione per gestire l'evento di caricamento di un'immagine
    const handleImageLoad = (index) => {
        setLoadingImg(prevLoading => {
            const newLoading = [...prevLoading];
            newLoading[index] = false;
            return newLoading;
        });
    };

    const [zoom, setZoom] = useState(1);

    function switchZoom() {
        setZoom(zoom == 1 ? 2.4 : 1);
    }

    // Gestione del cambio pagina
    const handleSlideChange = (swiper) => {
        const newPage = swiper.activeIndex + 1;
        updateCurrentPage(newPage);
    };

    return (
        <>
            {/* HEADER */}
            <Stack bgcolor={'#16192a'} width={'100%'} direction={'row'} justifyContent={'space-between'} alignItems={'center'} height={'78px'}>
                <Button sx={{ height: 1, color: 'white' }} onClick={closeChapter}><i className="fa-solid fa-chevron-left"></i></Button>
                <Stack sx={{ opacity: .5 }} spacing={1} alignItems={'center'} justifyContent={'center'} py={2}>
                    <Typography variant="h3" color={'white'} fontSize={10}>ONE PIECE</Typography>
                    <Typography textAlign={'center'} variant="h2" color={'white'} fontSize={15}>CAPITOLO {chapter}</Typography>
                </Stack>
                <Button onClick={switchZoom} sx={{ height: 1, color: 'white' }}><i className="fa-solid fa-magnifying-glass"></i></Button>
            </Stack>

            {/* SLIDER */}
            <Swiper
                modules={[A11y, Zoom]}
                spaceBetween={30}
                slidesPerView={1}
                onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                    if (initialPage > 1) {
                        swiper.slideTo(initialPage - 1, 0);
                    }
                }}
                onSlideChange={handleSlideChange}
                style={{ height: 'calc(100dvh - (78px * 2 + 20px))', position: 'relative' }}
                allowSlideNext={zoom == 1 ? true : false}
                allowSlidePrev={zoom == 1 ? true : false}
                touchStartPreventDefault={zoom == 1 ? true : false}
            >
                {
                    pages.map((page, index) => (
                        <SwiperSlide key={index}>
                            <Stack direction="row" justifyContent="center" alignItems="center" height={1} width={1} bgcolor="#1d2136">
                                <Box height={1} width={1} sx={{ overflowX: 'auto', overflowY: 'hidden' }}>
                                    <Box height={1} width={100 * zoom + '%'} sx={{transition: 'width 0.5s ease'}}>
                                        <img
                                            className={"fit-contain"}
                                            width={1}
                                            height={1}
                                            src={page}
                                            alt={`page${Number(index) + 1}`}
                                            onLoad={() => handleImageLoad(index)}
                                        />
                                    </Box>
                                </Box>
                                <Fade in={loadingImg[index]} unmountOnExit>
                                    <Stack position="absolute"
                                        height={'100%'}
                                        width={'100%'}
                                        justifyContent="center"
                                        alignItems="center"
                                        textAlign="center"
                                        bgcolor={'#1d2136'}>
                                        <span className="loader"></span>
                                    </Stack>
                                </Fade>
                            </Stack>
                        </SwiperSlide>
                    ))
                }
                <SwiperSlide>
                    <Stack spacing={2} justifyContent={'center'} alignItems={'center'} height={'100%'} width={'100%'} bgcolor={'#1d2136'}>
                        {loading ?
                            <Stack position="absolute"
                                spacing={5}
                                height={'100%'}
                                width={'100%'}
                                justifyContent="center"
                                alignItems="center"
                                textAlign="center"
                                bgcolor={'#1d2136'}>
                                <span className="loader"></span>
                                <Typography color={'white'} textAlign={'center'} variant='subtitle2' fontSize={12}>CARICANDO NUOVE PAGINE</Typography>
                            </Stack>
                            :
                            <>
                                <Typography color={'white'} textAlign={'center'} variant="h2" fontSize={15}>FINE CAPITOLO</Typography>
                                <Button disabled={isLastChap} onClick={nextChap} variant='contained' sx={{ bgcolor: '#6024a6', color: 'white', display: 'flex', gap: '5px' }}>VAI AL SUCCESSIVO<i className="fa-solid fa-chevron-right"></i></Button>
                            </>
                        }
                    </Stack>
                </SwiperSlide>
            </Swiper>

            {/* FOOTER */}
            <Stack bgcolor={'#16192a'} width={'100%'} direction={'row'} justifyContent={'space-between'} alignItems={'center'} height={'98px'} px={2} pb={'20px'}>
                <Button onClick={prevChap} sx={{ height: 1, color: 'white', display: 'flex', gap: '5px' }} ><i className="fa-solid fa-angles-left"></i>PREC</Button>
                <Stack sx={{ opacity: .5 }} spacing={.2} alignItems={'center'} justifyContent={'center'} py={2}>
                    <Typography textAlign={'center'} variant="h2" color={'white'} fontSize={15}>{String(initialPage).padStart(2, '0')}/{String(pages.length).padStart(2, '0')}</Typography>
                    {loading && <Typography variant="h3" color={'white'} fontSize={10}>...caricamento pagine...</Typography>}
                </Stack>
                <Button disabled={isLastChap} onClick={nextChap} sx={{ height: 1, color: 'white', display: 'flex', gap: '5px' }}>SUCC<i className="fa-solid fa-angles-right"></i></Button>
            </Stack>
        </>
    )
}

PageSlider.propTypes = {
    volume: PropTypes.string.isRequired,
    chapter: PropTypes.string.isRequired,
    closeChapter: PropTypes.func.isRequired,
    nextChap: PropTypes.func.isRequired,
    prevChap: PropTypes.func.isRequired,
    isLastChap: PropTypes.bool.isRequired,
    initialPage: PropTypes.number
};

export default PageSlider
