import { createContext, useContext, useState, useEffect } from 'react';

const ReaderContext = createContext();

export function ReaderProvider({ children }) {
    // Stato per il capitolo corrente
    const [currentChapter, setCurrentChapter] = useState(1);
    const [currentVolume, setCurrentVolume] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    
    // Stato per l'ultimo capitolo letto
    const [lastReadChapter, setLastReadChapter] = useState(null);
    
    // Stato per le preferenze di visualizzazione
    const [isDescending, setIsDescending] = useState(true);
    const [chunkSize, setChunkSize] = useState(50);
    const [language, setLanguage] = useState('IT');

    // Carica i dati dal localStorage all'avvio
    useEffect(() => {
        const savedOrder = localStorage.getItem('chapterOrder');
        const savedChunkSize = localStorage.getItem('chapterChunkSize');
        const savedLastChapter = localStorage.getItem('lastReadChapter');
        const savedLanguage = localStorage.getItem('language');

        if (savedOrder !== null) {
            setIsDescending(JSON.parse(savedOrder));
        }
        if (savedChunkSize !== null) {
            setChunkSize(JSON.parse(savedChunkSize));
        }
        if (savedLastChapter !== null) {
            setLastReadChapter(JSON.parse(savedLastChapter));
        }
        if (savedLanguage !== null) {
            setLanguage(savedLanguage);
        }
    }, []);

    // Funzione per aggiornare il capitolo corrente
    const updateCurrentChapter = (chapter, volume, page = 1) => {
        setCurrentChapter(chapter);
        setCurrentVolume(volume);
        setCurrentPage(page);
        
        // Aggiorna anche lastReadChapter
        const newLastRead = { chapter, volume, page };
        setLastReadChapter(newLastRead);
        localStorage.setItem('lastReadChapter', JSON.stringify(newLastRead));
    };

    // Funzione per aggiornare la pagina corrente
    const updateCurrentPage = (page) => {
        setCurrentPage(page);
        if (lastReadChapter) {
            const newLastRead = { ...lastReadChapter, page };
            setLastReadChapter(newLastRead);
            localStorage.setItem('lastReadChapter', JSON.stringify(newLastRead));
        }
    };

    // Funzione per aggiornare l'ordine dei capitoli
    const updateChapterOrder = (isDesc) => {
        setIsDescending(isDesc);
        localStorage.setItem('chapterOrder', JSON.stringify(isDesc));
    };

    // Funzione per aggiornare la dimensione dei gruppi
    const updateChunkSize = (size) => {
        setChunkSize(size);
        localStorage.setItem('chapterChunkSize', JSON.stringify(size));
    };

    // Funzione per aggiornare la lingua
    const updateLanguage = (lang) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
    };

    const value = {
        // Stato corrente
        currentChapter,
        currentVolume,
        currentPage,
        lastReadChapter,
        isDescending,
        chunkSize,
        language,
        
        // Funzioni di aggiornamento
        updateCurrentChapter,
        updateCurrentPage,
        updateChapterOrder,
        updateChunkSize,
        updateLanguage,
    };

    return (
        <ReaderContext.Provider value={value}>
            {children}
        </ReaderContext.Provider>
    );
}

// Hook personalizzato per usare il context
export function useReader() {
    const context = useContext(ReaderContext);
    if (!context) {
        throw new Error('useReader deve essere usato all\'interno di un ReaderProvider');
    }
    return context;
} 