import { useEffect } from 'react';

/**
 * Custom hook to detect clicks outside a referenced DOM element
 */
export function useClickOutside(ref, callback, active = true, ignoreSelector = null) {
  useEffect(() => {
    if (!active) return;

    const handleOutsideClick = (e) => {
      if (ignoreSelector && e.target.closest && e.target.closest(ignoreSelector)) {
        return;
      }
      if (ref.current && !ref.current.contains(e.target)) {
        callback(e);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [ref, callback, active, ignoreSelector]);
}
