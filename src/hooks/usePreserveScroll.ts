import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const usePreserveScroll = (key: string, dependencies: any[]) => {
  const location = useLocation();
  const scrollPos = useRef(0);
  const hasRestored = useRef(false);

  useLayoutEffect(() => {
    if (hasRestored.current || dependencies.length === 0) return;
    const savedScrollPos = sessionStorage.getItem(key);
    if (savedScrollPos) {
      window.scrollTo(0, parseInt(savedScrollPos, 10));
      sessionStorage.removeItem(key);
      hasRestored.current = true;
    }
  }, [key, location, dependencies]);

  useEffect(() => {
    const handleScroll = () => {
      scrollPos.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    return () => {
      sessionStorage.setItem(key, scrollPos.current.toString());
    };
  }, [key, location]);
};

export default usePreserveScroll;
