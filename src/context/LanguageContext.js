import { createContext } from 'react';

export const LanguageContext = createContext(null);

export { LanguageProvider } from './LanguageProvider';
export { useLanguage } from '../hooks/useLanguage';
