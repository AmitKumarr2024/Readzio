import React, { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Navbar from "./components/Navbar";
import ScrollToTop from "./Utils/ScrollToTop";
import { checkAuth } from "./store/authSlice";
import { initializeSocket, disconnectSocket } from "./store/socketSlice";
import { getToken } from "./Utils/getToken";
import { fetchSiteAnalytics } from "./store/adminSlice";
import { setTheme } from "./store/themeSlice";

export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { theme } = useSelector((state) => state.theme);
  const socketInitialized = useRef(false);

  // Load theme on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      dispatch(setTheme(storedTheme));
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      dispatch(setTheme(prefersDark ? "dark" : "light"));
    }
  }, [dispatch]);

  // Apply theme class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Auth + socket setup
  useEffect(() => {
    dispatch(checkAuth());

    if (isAuthenticated && user?._id && getToken()) {
      if (user?.role === "admin") {
        dispatch(fetchSiteAnalytics({ startDate: "", endDate: "" }));
      }
      dispatch(initializeSocket());
    }

    return () => {
      dispatch(disconnectSocket());
    };
  }, [dispatch, isAuthenticated, user?._id, user?.role]);

  return (
    <div className="bg-background text-text-main min-h-screen transition-colors duration-300">
      <Navbar />
      <ScrollToTop />
      <Outlet />
    </div>
  );
}
