import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setTheme } from "../../store/themeSlice";

// Sets up theme based on localStorage or system preference
export const useThemeSetup = () => {
  const dispatch = useDispatch();
  const { theme } = useSelector((state) => state.theme);

  // Effect to initialize theme
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("theme");
      if (storedTheme === "dark" || storedTheme === "light") {
        dispatch(setTheme(storedTheme));
      } else {
        // Use system preference if no stored theme
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        dispatch(setTheme(systemPrefersDark ? "dark" : "light"));
      }
    } catch (e) {
      // Log localStorage errors
      console.error("[useThemeSetup] localStorage error:", e);
    }
  }, [dispatch]); // Run on dispatch change

  // Effect to apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]); // Run on theme change

  return theme;
};