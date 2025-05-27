import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import ScrollToTop from "./Utils/ScrollToTop";

import { useDispatch } from "react-redux";
import { checkAuth } from "./store/authSlice";

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // On app mount, verify auth status from token/localStorage
    dispatch(checkAuth());
  }, [dispatch]);

  return (
    <div>
      <Navbar />
      <ScrollToTop />
      <Outlet />
    </div>
  );
};

export default App;

