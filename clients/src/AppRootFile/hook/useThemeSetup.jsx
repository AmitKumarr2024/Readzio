// hooks/useThemeSetup.js
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setTheme } from "../../store/themeSlice";

export const useThemeSetup = () => {
  const dispatch = useDispatch();
  const { theme } = useSelector((state) => state.theme);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      dispatch(setTheme(storedTheme));
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      dispatch(setTheme(systemPrefersDark ? "dark" : "light"));
    }
  }, [dispatch]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return theme;
};
