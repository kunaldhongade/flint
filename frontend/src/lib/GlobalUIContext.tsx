import React, { createContext, ReactNode, useContext, useState } from 'react';

interface GlobalUIContextType {
    filePreview: File | null;
    openFilePreview: (file: File) => void;
    closeFilePreview: () => void;

    showModelSelector: boolean;
    openModelSelector: (initialSelected: string[], onConfirm: (models: string[]) => void) => void;
    closeModelSelector: () => void;
    modelSelectorOptions: {
        initialSelected: string[];
        onConfirm: (models: string[]) => void;
    } | null;
}

const GlobalUIContext = createContext<GlobalUIContextType | undefined>(undefined);

export const GlobalUIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [filePreview, setFilePreview] = useState<File | null>(null);
    const [showModelSelector, setShowModelSelector] = useState(false);
    const [modelSelectorOptions, setModelSelectorOptions] = useState<{
        initialSelected: string[];
        onConfirm: (models: string[]) => void;
    } | null>(null);

    const openFilePreview = (file: File) => setFilePreview(file);
    const closeFilePreview = () => setFilePreview(null);

    const openModelSelector = (initialSelected: string[], onConfirm: (models: string[]) => void) => {
        setModelSelectorOptions({ initialSelected, onConfirm });
        setShowModelSelector(true);
    };

    const closeModelSelector = () => {
        setShowModelSelector(false);
        setModelSelectorOptions(null);
    };

    return (
        <GlobalUIContext.Provider value={{
            filePreview,
            openFilePreview,
            closeFilePreview,
            showModelSelector,
            openModelSelector,
            closeModelSelector,
            modelSelectorOptions
        }}>
            {children}
        </GlobalUIContext.Provider>
    );
};

export const useGlobalUI = () => {
    const context = useContext(GlobalUIContext);
    if (!context) {
        throw new Error('useGlobalUI must be used within a GlobalUIProvider');
    }
    return context;
};
