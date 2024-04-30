import { useEffect, useState, useRef } from 'react'
import { Navigation, Pagination, Scrollbar, A11y, Zoom } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import { Box, Button, Stack, Typography, Fade } from '@mui/material';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';


function PageSlider({ volume, chapter, closeChapter, nextChap, prevChap, isLastChap }) {
    const imageLinkTemplate = `https://onepiecepower.com/manga8/onepiece/volumi/volume${String(volume).padStart(3, '0')}/${String(chapter).padStart(3, '0')}/`; // aggiungi page.jpg

    const [loading, setLoading] = useState(true);
    const [pages, setPages] = useState([
        imageLinkTemplate + '01.jpg',
        imageLinkTemplate + '02.jpg',
        imageLinkTemplate + '03.jpg',
        imageLinkTemplate + '04.jpg',
        imageLinkTemplate + '05.jpg',
    ]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(1);
    const isUnmountedRef = useRef(false);

    function checkImageExists(imageUrl) {
        return new Promise((resolve, reject) => {
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
                // Se l'immagine esiste, aggiungila
                setPages((prevUrls) => [...prevUrls, imgUrl]);
                setLoadingImg((prevLoadings) => [...prevLoadings, true])
            } else {
                // Se l'immagine non esiste, interrompi il ciclo
                setLoading(false)
                break;
            }
        }
    }

    useEffect(() => {
        addRemainsPagesToChapter();
        return () => {
            // Imposta il flag isUnmounted a true quando il componente viene smontato
            isUnmountedRef.current = true;
        };
    }, [])

    const [loadingImg, setLoadingImg] = useState(new Array(pages.length).fill(true)); // Array di booleani per tenere traccia dello stato di caricamento di ciascuna immagine

    // Funzione per gestire l'evento di caricamento di un'immagine
    const handleImageLoad = (index) => {
        // Imposta lo stato di caricamento dell'immagine corrente su false
        setLoadingImg(prevLoading => {
            const newLoading = [...prevLoading];
            newLoading[index] = false;
            return newLoading;
        });
    };

    const [isZoomed, setIsZoomed] = useState(false);

    function handleZoomChange(newTransform){
        setIsZoomed(newTransform.state.scale !== 1)
    }

    return (
        <>
            {/* HEADER */}
            <Stack bgcolor={'#16192a'} width={'100%'} direction={'row'} justifyContent={'space-between'} alignItems={'center'} height={'78px'}>
                <Button sx={{ height: 1, color: 'white' }} onClick={closeChapter}><i className="fa-solid fa-chevron-left"></i></Button>
                <Stack sx={{ opacity: .5 }} spacing={1} alignItems={'center'} justifyContent={'center'} py={2}>
                    <Typography variant="h3" color={'white'} fontSize={10}>ONE PIECE</Typography>
                    <Typography textAlign={'center'} variant="h2" color={'white'} fontSize={15}>CAPITOLO {isZoomed}</Typography>
                </Stack>
                <Button sx={{ height: 1, color: 'white' }}><i className="fa-regular fa-circle-question"></i></Button>
            </Stack>

            {/* SLIDER */}
            <Swiper
                modules={[A11y, Zoom]}
                spaceBetween={30}
                slidesPerView={1}
                zoom={{ toggle: true }}
                onSwiper={(swiper) => console.log(swiper)}
                onSlideChange={(swiper) => setCurrentSlideIndex(swiper.activeIndex + 1)}
                style={{ height: 'calc(100dvh - (78px * 2))', position: 'relative' }}
            >
                {
                    pages.map((page, index) => (
                        <SwiperSlide key={index}>
                            <Stack direction="row" justifyContent="center" alignItems="center" height="100%" width="100%" bgcolor="#1d2136">
                                <TransformWrapper panning={{disabled: !isZoomed}} onZoomStop={handleZoomChange}>
                                    <TransformComponent>

                                        <img
                                            className="fit-contain"
                                            src={page}
                                            alt={`page${Number(index) + 1}`}
                                            onLoad={() => handleImageLoad(index)} // Chiamata quando l'immagine è caricata
                                        />
                                    </TransformComponent>
                                </TransformWrapper>
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
                                <Button onClick={nextChap} variant='contained' sx={{ bgcolor: '#6024a6', color: 'white', display: 'flex', gap: '5px' }}>VAI AL SUCCESSIVO<i className="fa-solid fa-chevron-right"></i></Button>
                            </>
                        }
                    </Stack>
                </SwiperSlide>

            </Swiper>

            {/* FOOTER */}
            <Stack bgcolor={'#16192a'} width={'100%'} direction={'row'} justifyContent={'space-between'} alignItems={'center'} height={'78px'} px={2}>
                <Button onClick={prevChap} sx={{ height: 1, color: 'white', display: 'flex', gap: '5px' }} ><i class="fa-solid fa-angles-left"></i>PREC</Button>
                <Stack sx={{ opacity: .5 }} spacing={.2} alignItems={'center'} justifyContent={'center'} py={2}>
                    <Typography textAlign={'center'} variant="h2" color={'white'} fontSize={15}>{String(currentSlideIndex).padStart(2, '0')}/{String(pages.length).padStart(2, '0')}</Typography>
                    {loading && <Typography variant="h3" color={'white'} fontSize={10}>...caricamento pagine...</Typography>}
                </Stack>
                <Button disabled={isLastChap} onClick={nextChap} sx={{ height: 1, color: 'white', display: 'flex', gap: '5px' }}>SUCC<i class="fa-solid fa-angles-right"></i></Button>
            </Stack>
        </>
    )
}

export default PageSlider
