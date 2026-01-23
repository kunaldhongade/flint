import React, { createContext, ReactNode, useContext, useState } from 'react';

interface ErrorData {
    message: string;
    detail?: string;
}

interface ErrorContextType {
    showError: (error: ErrorData) => void;
    clearError: () => void;
    error: ErrorData | null;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [error, setError] = useState<ErrorData | null>(null);

    const showError = (errorData: ErrorData) => {
        setError(errorData);
    };

    const clearError = () => {
        setError(null);
    };

    return (
        <ErrorContext.Provider value={{ showError, clearError, error }}>
            {children}
        </ErrorContext.Provider>
    );
};

export const useError = () => {
    const context = useContext(ErrorContext);
    if (context === undefined) {
        throw new Error('useError must be used within an ErrorProvider');
    }
    return context;
};
