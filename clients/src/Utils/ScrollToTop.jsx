import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scrolls to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error("[ScrollToTop] Scroll error:", e);
    }
  }, [pathname]); // Run on route change

  return null;
};

export default ScrollToTop;