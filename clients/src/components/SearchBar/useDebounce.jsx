import { useRef, useEffect, useCallback } from "react";

function useDebounce(callback, delay) {
  const timeoutRef = useRef(null);

  const debouncedFunction = useCallback((...args) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return debouncedFunction;
}

export default useDebounce;