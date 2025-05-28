import { useEffect, useState, useRef } from 'react'
import { A11y, Zoom } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import PropTypes from 'prop-types';
import { useReader } from '../context/ReaderContext';
import { Box, Button, Stack, Typography, Fade, Slide } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';

const checkImageExists = (imageUrl) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = imageUrl;
    });
};

function PageSlider({ volume, chapter, closeChapter, nextChap, prevChap, isLastChap, initialPage = 1 }) {
    const { language } = useReader();
    const baseUrl = language === 'IT'
        ? 'https://onepiecepower.com/manga8/onepiece/volumi/volume'
        : 'https://onepiecepower.com/manga8/onepiece/eng/volume';

    const imageLinkTemplate = `${baseUrl}${String(volume).padStart(3, '0')}/${String(chapter).padStart(3, '0')}/`;

    const isUnmountedRef = useRef(false);
    const swiperRef = useRef(null);
    const scrollRef = useRef(null);
    const { updateCurrentPage } = useReader();

    const [loading, setLoading] = useState(true);
    const [pages, setPages] = useState([]);
    const [loadingImg, setLoadingImg] = useState([]);

    const [zoom, setZoom] = useState(1);
    const [isZoomed, setIsZoomed] = useState(false);

    const handleZoomToggle = () => {
        setIsZoomed(!isZoomed);
        setZoom(isZoomed ? 1 : 2.4);
    };

    useEffect(() => {
        if (isZoomed && scrollRef.current) {
            setTimeout(() => {
                requestAnimationFrame(() => {
                    const scrollEl = scrollRef.current;
                    if (scrollEl) {
                        scrollEl.scrollLeft = scrollEl.scrollWidth - scrollEl.clientWidth;
                    }
                });
            }, 100); // puoi aumentare tipo a 50ms se ancora troppo presto
        }
    }, [isZoomed]);



    const handleImageLoad = (index) => {
        setLoadingImg(prevLoading => {
            const newLoading = [...prevLoading];
            newLoading[index] = false;
            return newLoading;
        });
    };

    const handleSlideChange = (swiper) => {
        const newPage = swiper.activeIndex + 1;
        updateCurrentPage(newPage);
    };

    const loadInitialPages = () => {
        const initialPages = [];
        const startPage = 1;
        const endPage = initialPage === 1 ? 6 : initialPage;

        for (let i = startPage; i <= endPage; i++) {
            const imgNumber = String(i).padStart(2, '0');
            initialPages.push(`${imageLinkTemplate}${imgNumber}.jpg`);
        }
        setPages(initialPages);
        setLoadingImg(new Array(endPage).fill(true));
    };

    const loadRemainingPages = async () => {
        setLoading(true);
        let pageNum = pages.length;

        while (!isUnmountedRef.current) {
            pageNum += 1;
            const imgNumber = String(pageNum).padStart(2, '0');
            const imgUrl = `${imageLinkTemplate}${imgNumber}.jpg`;

            const imageExists = await checkImageExists(imgUrl);
            if (imageExists) {
                setPages(prevUrls => {
                    if (!prevUrls.includes(imgUrl)) {
                        return [...prevUrls, imgUrl];
                    }
                    return prevUrls;
                });
                setLoadingImg(prevLoadings => [...prevLoadings, true]);
            } else {
                setLoading(false);
                break;
            }
        }
    };

    useEffect(() => {
        isUnmountedRef.current = false;
        loadInitialPages();
        loadRemainingPages();

        return () => {
            isUnmountedRef.current = true;
        };
    }, [imageLinkTemplate]);

    useEffect(() => {
        if (swiperRef.current && pages.length > 0) {
            swiperRef.current.slideTo(initialPage - 1, 0);
        }
    }, [pages, initialPage]);

    return (
        <Box sx={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#1d2136'
        }}>
            {/* HEADER */}
            <Stack bgcolor={'#16192a'} width={'100%'} direction={'row'} justifyContent={'space-between'} alignItems={'center'} height={'78px'}>
                <Button sx={{ height: 1, color: 'white' }} onClick={closeChapter}><i className="fa-solid fa-chevron-left"></i></Button>
                <Stack sx={{ opacity: .5 }} spacing={1} alignItems={'center'} justifyContent={'center'} py={2}>
                    <Typography variant="h3" color={'white'} fontSize={10}>ONE PIECE</Typography>
                    <Typography textAlign={'center'} variant="h2" color={'white'} fontSize={15}>CAPITOLO {chapter}</Typography>
                </Stack>
                <Button onClick={handleZoomToggle} sx={{ height: 1, color: 'white' }}><i className="fa-solid fa-magnifying-glass"></i></Button>
            </Stack>

            {/* CONTENT */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Swiper
                    modules={[A11y, Zoom]}
                    spaceBetween={0}
                    threshold={5}
                    slidesPerView={1}
                    cssMode={false}
                    grabCursor={true}
                    touchRatio={1}
                    touchAngle={45}
                    resistance={true}
                    resistanceRatio={0.85}
                    allowSlideNext={!isZoomed}
                    allowSlidePrev={!isZoomed}
                    allowTouchMove={!isZoomed}
                    touchMoveStopPropagation={false}
                    onSwiper={(swiper) => {
                        swiperRef.current = swiper;
                        if (initialPage > 1) {
                            swiper.slideTo(initialPage - 1, 0);
                        }
                    }}
                    onSlideChange={handleSlideChange}
                    style={{
                        height: '100%',
                        transform: 'translateZ(0)', // attiva GPU
                        willChange: 'transform'
                    }}
                    speed={350}
                >

                    {pages.map((page, index) => (
                        <SwiperSlide key={index}>
                            <Stack direction="row" justifyContent="center" alignItems="center" height={1} width={1} bgcolor="#1d2136">
                                <Box
                                    ref={scrollRef}
                                    height={1}
                                    width={1}
                                    onTouchStart={(e) => isZoomed && e.stopPropagation()}
                                    onTouchMove={(e) => isZoomed && e.stopPropagation()}
                                    onPointerDown={(e) => isZoomed && e.stopPropagation()}

                                    sx={{
                                        overflowX: isZoomed ? 'auto' : 'hidden',
                                        overflowY: 'hidden',
                                        WebkitOverflowScrolling: 'touch',
                                        touchAction: 'pan-x',
                                        overscrollBehavior: 'none',
                                        whiteSpace: 'nowrap',
                                        display: 'flex',
                                        scrollBehavior: 'smooth',
                                        msOverflowStyle: 'none',
                                        scrollbarWidth: 'none',
                                        '&::-webkit-scrollbar': {
                                            display: 'none'
                                        }
                                    }}
                                >
                                    <Box
                                        height={1}
                                        width={`${100 * zoom}%`}
                                        sx={{
                                            transition: 'width 0.3s ease',
                                            flexShrink: 0
                                        }}
                                    >
                                        <img
                                            className={"fit-contain"}
                                            width="100%"
                                            height={1}
                                            src={page}
                                            alt={`page${Number(index) + 1}`}
                                            onLoad={() => handleImageLoad(index)}
                                            draggable={false}
                                            style={{
                                                display: 'block',
                                                userSelect: 'none',
                                                pointerEvents: 'none',
                                                WebkitUserDrag: 'none'
                                            }}
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
                    ))}
                    <SwiperSlide>
                        <Stack spacing={2} justifyContent={'center'} alignItems={'center'} height={'100%'} width={'100%'} bgcolor={'#1d2136'}>
                            {loading ? (
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
                            ) : (
                                <>
                                    <Typography color={'white'} textAlign={'center'} variant="h2" fontSize={15}>FINE CAPITOLO</Typography>
                                    <Button disabled={isLastChap} onClick={nextChap} variant='contained' sx={{ bgcolor: '#6024a6', color: 'white', display: 'flex', gap: '5px' }}>VAI AL SUCCESSIVO<i className="fa-solid fa-chevron-right"></i></Button>
                                </>
                            )}
                        </Stack>
                    </SwiperSlide>
                </Swiper>
            </Box>

            {/* FOOTER */}
            <Stack
                bgcolor={'#16192a'}
                width={'100%'}
                direction={'column'}
                justifyContent={'space-between'}
                alignItems={'center'}
                sx={{
                    pb: { xs: 'calc(16px + 16px)', sm: 2 }
                }}
            >
                <Stack direction={'row'} width={'100%'} justifyContent={'space-between'} alignItems={'center'} height={'78px'} px={2}>
                    <Button onClick={prevChap} sx={{ height: 1, color: 'white', display: 'flex', gap: '5px' }} ><i className="fa-solid fa-angles-left"></i>PREC</Button>
                    <Stack sx={{ opacity: .5 }} spacing={.2} alignItems={'center'} justifyContent={'center'} py={2}>
                        <Typography textAlign={'center'} variant="h2" color={'white'} fontSize={15}>{String(initialPage).padStart(2, '0')}/{String(pages.length).padStart(2, '0')}</Typography>
                        {loading && <Typography variant="h3" color={'white'} fontSize={10}>...caricamento pagine...</Typography>}
                    </Stack>
                    <Button disabled={isLastChap} onClick={nextChap} sx={{ height: 1, color: 'white', display: 'flex', gap: '5px' }}>SUCC<i className="fa-solid fa-angles-right"></i></Button>
                </Stack>
            </Stack>
        </Box>
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
