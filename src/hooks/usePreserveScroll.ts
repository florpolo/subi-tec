import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const usePreserveScroll = (key: string) => { // No longer needs listRef directly
  const location = useLocation();
  const scrollPos = useRef(0);
  const isRestoring = useRef(false); // Flag to prevent saving scroll during restoration

  // Effect to save scroll position when leaving the page
  useEffect(() => {
    const handleScroll = () => {
      if (!isRestoring.current) {
        scrollPos.current = window.scrollY;
      }
    };

    const saveScroll = () => {
      if (!isRestoring.current) {
        sessionStorage.setItem(key, scrollPos.current.toString());
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('beforeunload', saveScroll); // Save before unload

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', saveScroll);
      // Also save on component unmount, in case beforeunload doesn't fire reliably
      if (!isRestoring.current) {
        sessionStorage.setItem(key, window.scrollY.toString());
      }
    };
  }, [key]);

  // Effect to restore scroll position when component mounts or location changes
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem(key);
    if (savedScrollPos) {
      isRestoring.current = true;
      // Use requestAnimationFrame to ensure scroll happens after browser paint
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(savedScrollPos, 10));
        sessionStorage.removeItem(key); // Clear after restoration
        isRestoring.current = false;
      });
    }
  }, [key, location.key]); // Depend on location.key to trigger on navigation within same component
};

export default usePreserveScroll;