import { useCallback, useEffect, useState, useRef } from 'react'
import { A11y } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import PropTypes from 'prop-types';
import { useReader } from '../context/ReaderContext';
import { Box, Button, Stack, Typography, Fade } from '@mui/material';
import Panzoom from '@panzoom/panzoom';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';

const createEmptySliderData = () => ({
    normalPages: [],
    splitPages: [],
    normalLogicalToSlide: [],
    splitLogicalToSlide: [],
    normalSlideToLogical: [],
    splitSlideToLogical: []
});

const checkImageExists = (imageUrl) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = imageUrl;
    });
};

function PageSlider({ volume, chapter, closeChapter, nextChap, prevChap, isLastChap, initialPage = 1 }) {
    const { language, edition } = useReader();
    const baseUrl = language === 'ENG'
        ? 'https://onepiecepower.com/manga8/onepiece/eng/volume'
        : edition === 'COLORED'
          ? 'https://onepiecepower.com/manga8/onepiece/volumiSpeciali/volumiColored/volume'
          : 'https://onepiecepower.com/manga8/onepiece/volumi/volume';

    const imageLinkTemplate = `${baseUrl}${String(volume).padStart(3, '0')}/${String(chapter).padStart(3, '0')}/`;

    const isUnmountedRef = useRef(false);
    const swiperRef = useRef(null);
    const panzoomElementsRef = useRef(new Map());
    const panzoomInstancesRef = useRef(new Map());
    const zoomScaleRef = useRef(new Map());
    const { updateCurrentPage } = useReader();

    const [loading, setLoading] = useState(true);
    const [pages, setPages] = useState([]);
    const [sliderData, setSliderData] = useState(createEmptySliderData);
    const [loadingImg, setLoadingImg] = useState({});

    const [isActivePageZoomed, setIsActivePageZoomed] = useState(false);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [splitHorizontalMode, setSplitHorizontalMode] = useState(false);
    const [currentLogicalPage, setCurrentLogicalPage] = useState(initialPage);
    const [currentSplitPart, setCurrentSplitPart] = useState(null);
    const imageSizeCacheRef = useRef({});
    const currentLogicalPageRef = useRef(initialPage);
    const requestedInitialPageRef = useRef(initialPage);
    const displayPages = splitHorizontalMode ? sliderData.splitPages : sliderData.normalPages;
    requestedInitialPageRef.current = initialPage;

    const getActivePageId = useCallback(() => {
        const swiper = swiperRef.current;
        if (!swiper) {
            return null;
        }

        const activePage = displayPages[swiper.activeIndex];
        return activePage?.id ?? null;
    }, [displayPages]);

    const syncActiveZoomState = useCallback(() => {
        const activePageId = getActivePageId();
        if (!activePageId) {
            setIsActivePageZoomed(false);
            return;
        }

        const currentScale = zoomScaleRef.current.get(activePageId) ?? 1;
        setIsActivePageZoomed(currentScale > 1.01);
    }, [getActivePageId]);

    const resetPageZoom = useCallback((pageId) => {
        const panzoomEntry = panzoomInstancesRef.current.get(pageId);
        if (!panzoomEntry) {
            return;
        }

        panzoomEntry.panzoom.zoom(1, { animate: true });
        panzoomEntry.panzoom.pan(0, 0, { animate: true });
        zoomScaleRef.current.set(pageId, 1);
        setIsActivePageZoomed(false);
        syncActiveZoomState();
    }, [syncActiveZoomState]);

    const handleZoomToggle = useCallback(() => {
        const activePageId = getActivePageId();
        if (!activePageId) {
            return;
        }

        const currentScale = zoomScaleRef.current.get(activePageId) ?? 1;

        if (currentScale > 1.01) {
            resetPageZoom(activePageId);
            return;
        }

        const panzoomEntry = panzoomInstancesRef.current.get(activePageId);
        if (!panzoomEntry) {
            return;
        }

        // Keep it immediate so one-finger pan is available right away.
        panzoomEntry.panzoom.zoom(2.2, { animate: false });
        zoomScaleRef.current.set(activePageId, 2.2);
        setIsActivePageZoomed(true);
        syncActiveZoomState();
    }, [getActivePageId, resetPageZoom, syncActiveZoomState]);

    const handleSplitHorizontalToggle = () => {
        const swiper = swiperRef.current;

        if (swiper) {
            const activeModeMap = splitHorizontalMode ? sliderData.splitSlideToLogical : sliderData.normalSlideToLogical;
            const logicalIndex = activeModeMap[swiper.activeIndex];
            const nextLogicalPage = typeof logicalIndex === 'number' ? logicalIndex + 1 : currentLogicalPageRef.current;
            currentLogicalPageRef.current = nextLogicalPage;
            setCurrentLogicalPage(nextLogicalPage);
        }

        setSplitHorizontalMode((prev) => !prev);
    };

    const handleImageLoad = (pageId) => {
        setLoadingImg(prevLoading => {
            return {
                ...prevLoading,
                [pageId]: false
            };
        });
    };

    const handleImageError = (pageId, index) => {
        console.error(`Errore caricamento immagine pagina ${index + 1}`);
        setLoadingImg(prevLoading => {
            return {
                ...prevLoading,
                [pageId]: false
            };
        });
    };

    const handleSlideChange = (swiper) => {
        setActiveSlideIndex(swiper.activeIndex);
        const activeModeMap = splitHorizontalMode ? sliderData.splitSlideToLogical : sliderData.normalSlideToLogical;
        const logicalIndex = activeModeMap[swiper.activeIndex];

        // Ignore non-logical slides (es. "fine capitolo")
        if (typeof logicalIndex !== 'number') {
            return;
        }

        const newLogicalPage = logicalIndex + 1;
        const activePages = splitHorizontalMode ? sliderData.splitPages : sliderData.normalPages;
        const activePage = activePages[swiper.activeIndex];
        const splitPart = activePage?.splitSide === 'right' ? 1 : activePage?.splitSide === 'left' ? 2 : null;

        currentLogicalPageRef.current = newLogicalPage;
        setCurrentLogicalPage(newLogicalPage);
        setCurrentSplitPart(splitPart);
        updateCurrentPage(newLogicalPage);
        syncActiveZoomState();
    };

    const getImageSize = (imageUrl) => {
        if (imageSizeCacheRef.current[imageUrl]) {
            return Promise.resolve(imageSizeCacheRef.current[imageUrl]);
        }

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const size = {
                    width: img.naturalWidth || 0,
                    height: img.naturalHeight || 0
                };
                imageSizeCacheRef.current[imageUrl] = size;
                resolve(size);
            };
            img.onerror = () => resolve({ width: 0, height: 0 });
            img.src = imageUrl;
        });
    };

    useEffect(() => {
        isUnmountedRef.current = false;
        imageSizeCacheRef.current = {};
        setSliderData(createEmptySliderData());
        const chapterStartPage = requestedInitialPageRef.current;
        setCurrentLogicalPage(chapterStartPage);
        setCurrentSplitPart(null);
        currentLogicalPageRef.current = chapterStartPage;
        setSplitHorizontalMode(false);
        setLoading(true);

        const initialPages = [];
        const startPage = 1;
        const endPage = chapterStartPage === 1 ? 6 : chapterStartPage;

        for (let i = startPage; i <= endPage; i++) {
            const imgNumber = String(i).padStart(2, '0');
            initialPages.push(`${imageLinkTemplate}${imgNumber}.jpg`);
        }
        setPages(initialPages);

        const loadRemainingPages = async () => {
            let pageNum = endPage;

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
                } else {
                    setLoading(false);
                    break;
                }
            }
        };

        loadRemainingPages();

        return () => {
            isUnmountedRef.current = true;
        };
    }, [imageLinkTemplate]);

    useEffect(() => {
        let cancelled = false;

        const buildSliderData = async () => {
            if (!pages.length) {
                if (!cancelled) {
                    setSliderData(createEmptySliderData());
                }
                return;
            }

            const normalPages = pages.map((page, index) => ({
                id: `${page}-full-${index}`,
                src: page,
                originalIndex: index,
                splitSide: null,
                splitAspectRatio: null
            }));
            const normalLogicalToSlide = pages.map((_, index) => index);
            const normalSlideToLogical = pages.map((_, index) => index);
            const sizes = await Promise.all(pages.map((page) => getImageSize(page)));
            const splitPages = [];
            const splitLogicalToSlide = [];
            const splitSlideToLogical = [];

            pages.forEach((page, index) => {
                const { width, height } = sizes[index];
                const isLandscape = width > height;
                splitLogicalToSlide[index] = splitPages.length;

                if (isLandscape) {
                    const halfWidth = width / 2;
                    splitPages.push({
                        id: `${page}-right-${index}`,
                        src: page,
                        originalIndex: index,
                        splitSide: 'right',
                        splitAspectRatio: halfWidth > 0 && height > 0 ? halfWidth / height : 0.5
                    });
                    splitSlideToLogical.push(index);
                    splitPages.push({
                        id: `${page}-left-${index}`,
                        src: page,
                        originalIndex: index,
                        splitSide: 'left',
                        splitAspectRatio: halfWidth > 0 && height > 0 ? halfWidth / height : 0.5
                    });
                    splitSlideToLogical.push(index);
                    return;
                }

                splitPages.push({
                    id: `${page}-full-${index}`,
                    src: page,
                    originalIndex: index,
                    splitSide: null,
                    splitAspectRatio: null
                });
                splitSlideToLogical.push(index);
            });

            if (!cancelled) {
                setSliderData({
                    normalPages,
                    splitPages,
                    normalLogicalToSlide,
                    splitLogicalToSlide,
                    normalSlideToLogical,
                    splitSlideToLogical
                });
            }
        };

        buildSliderData();

        return () => {
            cancelled = true;
        };
    }, [pages]);

    useEffect(() => {
        const swiper = swiperRef.current;
        const logicalIndex = Math.max(0, currentLogicalPageRef.current - 1);
        const targetMap = splitHorizontalMode ? sliderData.splitLogicalToSlide : sliderData.normalLogicalToSlide;
        const targetSlide = targetMap[logicalIndex];

        if (!swiper || !targetMap.length || typeof targetSlide !== 'number') {
            return;
        }

        if (swiper.activeIndex !== targetSlide) {
            swiper.slideTo(targetSlide, 0);
        }
    }, [splitHorizontalMode, sliderData]);

    useEffect(() => {
        syncActiveZoomState();
    }, [displayPages, syncActiveZoomState]);

    useEffect(() => {
        const availablePageIds = new Set(displayPages.map((page) => page.id));

        Array.from(panzoomInstancesRef.current.keys()).forEach((pageId) => {
            if (availablePageIds.has(pageId)) {
                return;
            }

            const instance = panzoomInstancesRef.current.get(pageId);
            if (instance) {
                instance.destroy();
            }
            panzoomInstancesRef.current.delete(pageId);
            panzoomElementsRef.current.delete(pageId);
            zoomScaleRef.current.delete(pageId);
        });
    }, [displayPages]);

    useEffect(() => {
        const panzoomInstances = panzoomInstancesRef.current;
        const panzoomElements = panzoomElementsRef.current;
        const zoomScales = zoomScaleRef.current;

        return () => {
            panzoomInstances.forEach((instance) => instance.destroy());
            panzoomInstances.clear();
            panzoomElements.clear();
            zoomScales.clear();
        };
    }, []);

    const bindPanzoom = useCallback((pageId, element) => {
        if (!element || panzoomInstancesRef.current.has(pageId)) {
            return;
        }

        const panzoom = Panzoom(element, {
            minScale: 1,
            maxScale: 4,
            startScale: zoomScaleRef.current.get(pageId) ?? 1,
            // Disable containment clamp to allow free pan while zoomed.
            contain: false,
            canvas: true,
            animate: true,
            panOnlyWhenZoomed: true,
            pinchAndPan: true,
            handleStartEvent: (event) => {
                const scale = panzoom.getScale();
                const touchCount = event?.touches?.length ?? 0;
                const isPointerPinch = event?.pointerType === 'touch' && event?.isPrimary === false;
                const isPinchGesture = touchCount >= 2 || isPointerPinch;
                const shouldCaptureGesture = isPinchGesture || scale > 1.01;

                if (!shouldCaptureGesture) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
            }
        });

        const handlePanzoomChange = (event) => {
            const scale = event?.detail?.scale ?? 1;
            zoomScaleRef.current.set(pageId, scale);
            if (getActivePageId() === pageId) {
                setIsActivePageZoomed(scale > 1.01);
            }
        };

        element.addEventListener('panzoomchange', handlePanzoomChange);

        panzoomInstancesRef.current.set(pageId, {
            panzoom,
            destroy: () => {
                element.removeEventListener('panzoomchange', handlePanzoomChange);
                panzoom.destroy();
            }
        });

        zoomScaleRef.current.set(pageId, zoomScaleRef.current.get(pageId) ?? 1);
    }, [getActivePageId]);

    const setPanzoomElementRef = useCallback((pageId, element) => {
        if (!element) {
            panzoomElementsRef.current.delete(pageId);
            const instance = panzoomInstancesRef.current.get(pageId);
            if (instance) {
                instance.destroy();
                panzoomInstancesRef.current.delete(pageId);
            }
            return;
        }

        panzoomElementsRef.current.set(pageId, element);
        bindPanzoom(pageId, element);
    }, [bindPanzoom]);

    useEffect(() => {
        setLoadingImg((prev) => {
            const next = {};

            displayPages.forEach((page) => {
                next[page.id] = prev[page.id] ?? true;
            });

            return next;
        });
    }, [displayPages]);

    const formattedCurrentPage = splitHorizontalMode && currentSplitPart
        ? `${currentLogicalPage}(${currentSplitPart})`
        : String(currentLogicalPage).padStart(2, '0');

    return (
        <Box sx={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#1d2136'
        }}>
            {/* HEADER */}
            <Stack
                bgcolor={'#16192a'}
                width={'100%'}
                direction={'row'}
                alignItems={'center'}
                height={'78px'}
                px={0.5}
            >
                <Box sx={{ flex: 1, minWidth: 0, height: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                    <Button sx={{ height: 1, color: 'white', minWidth: 40, px: 1 }} onClick={closeChapter}>
                        <i className="fa-solid fa-chevron-left"></i>
                    </Button>
                </Box>

                <Stack sx={{ width: 125, opacity: .5 }} spacing={1} alignItems={'center'} justifyContent={'center'} py={2} mx={3}>
                    <Typography variant="h3" color={'white'} fontSize={11}>VOLUME {volume}</Typography>
                    <Typography textAlign={'center'} variant="h2" color={'white'} fontSize={15}>CAPITOLO {chapter}</Typography>
                </Stack>

                <Stack direction="row" alignItems="center" height={1} sx={{ flex: 1, minWidth: 0 }}>
                    <Button
                        onClick={handleSplitHorizontalToggle}
                        sx={{ height: 1, width: '50%', minWidth: 0, color: splitHorizontalMode ? '#8d5cff' : 'white' }}
                        title="Toggle split immagini orizzontali"
                    >
                        <i className={`fa-solid ${splitHorizontalMode ? 'fa-file' : 'fa-book-open'}`}></i>
                    </Button>
                    <Button onClick={handleZoomToggle} sx={{ height: 1, width: '50%', minWidth: 0, color: 'white' }}>
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </Button>
                </Stack>
            </Stack>

            {/* CONTENT */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Swiper
                    modules={[A11y]}
                    spaceBetween={0}
                    threshold={5}
                    slidesPerView={1}
                    cssMode={false}
                    grabCursor={true}
                    noSwiping
                    touchRatio={1}
                    touchAngle={45}
                    resistance={true}
                    resistanceRatio={0.85}
                    allowSlideNext={!isActivePageZoomed}
                    allowSlidePrev={!isActivePageZoomed}
                    allowTouchMove={!isActivePageZoomed}
                    touchMoveStopPropagation={false}
                    touchStartPreventDefault={false}
                    touchStartForcePreventDefault={false}
                    onSwiper={(swiper) => {
                        swiperRef.current = swiper;
                        setActiveSlideIndex(swiper.activeIndex);
                    }}
                    onSlideChange={handleSlideChange}
                    style={{
                        height: '100%',
                        transform: 'translateZ(0)', // attiva GPU
                        willChange: 'transform'
                    }}
                    speed={350}
                >

                    {displayPages.map((page, index) => (
                        <SwiperSlide key={page.id}>
                            <Stack direction="row" justifyContent="center" alignItems="center" height={1} width={1} bgcolor="#1d2136">
                                <Box
                                    className={
                                        isActivePageZoomed && activeSlideIndex === index
                                            ? 'swiper-no-swiping'
                                            : undefined
                                    }
                                    height={1}
                                    width={1}

                                    sx={{
                                        overflow: 'hidden',
                                        touchAction: 'none',
                                        overscrollBehavior: 'none',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Box
                                        ref={(element) => setPanzoomElementRef(page.id, element)}
                                        height={1}
                                        width={1}
                                        sx={{
                                            willChange: 'transform',
                                            transformOrigin: 'center center',
                                            touchAction: 'none',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {page.splitSide ? (
                                            <Box
                                                height={1}
                                                width={1}
                                                display="flex"
                                                justifyContent="center"
                                                alignItems="center"
                                            >
                                                <Box
                                                    height="100%"
                                                    overflow="hidden"
                                                    sx={{
                                                        position: 'relative',
                                                        width: 'auto',
                                                        maxWidth: '100%',
                                                        aspectRatio: page.splitAspectRatio || 0.5
                                                    }}
                                                >
                                                    <img
                                                        width="100%"
                                                        height={1}
                                                        src={page.src}
                                                        alt={`page${Number(index) + 1}`}
                                                        onLoad={() => handleImageLoad(page.id)}
                                                        onError={() => handleImageError(page.id, index)}
                                                        draggable={false}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            display: 'block',
                                                            width: '200%',
                                                            height: '100%',
                                                            transform: page.splitSide === 'right' ? 'translateX(-50%)' : 'translateX(0)',
                                                            userSelect: 'none',
                                                            pointerEvents: 'auto',
                                                            WebkitUserDrag: 'none'
                                                        }}
                                                    />
                                                </Box>
                                            </Box>
                                        ) : (
                                            <img
                                                className={"fit-contain"}
                                                width="100%"
                                                height={1}
                                                src={page.src}
                                                alt={`page${Number(index) + 1}`}
                                                onLoad={() => handleImageLoad(page.id)}
                                                onError={() => handleImageError(page.id, index)}
                                                draggable={false}
                                                style={{
                                                    display: 'block',
                                                    userSelect: 'none',
                                                    pointerEvents: 'auto',
                                                    WebkitUserDrag: 'none'
                                                }}
                                            />
                                        )}
                                    </Box>
                                </Box>
                                <Fade in={loadingImg[page.id]} unmountOnExit>
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
                    {displayPages.length === 0 ? (
                        <SwiperSlide>
                            <Stack
                                spacing={2}
                                justifyContent={'center'}
                                alignItems={'center'}
                                height={'100%'}
                                width={'100%'}
                                bgcolor={'#1d2136'}
                            >
                                <span className="loader"></span>
                                <Typography color={'white'} textAlign={'center'} variant='subtitle2' fontSize={12}>
                                    CARICAMENTO CAPITOLO
                                </Typography>
                            </Stack>
                        </SwiperSlide>
                    ) : (
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
                    )}
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
                        <Typography textAlign={'center'} variant="h2" color={'white'} fontSize={15}>{formattedCurrentPage}/{String(pages.length).padStart(2, '0')}</Typography>
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
