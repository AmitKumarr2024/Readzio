import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "react-router-dom";
import routes from "./routers/routes.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Provider } from "react-redux";
import store from "./store/store.js";
import { HelmetProvider } from "react-helmet-async"; // ✅ ADDED

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <HelmetProvider>
        {" "}
        {/* ✅ Global — sirf ek baar, sab pages cover */}
        <Toaster
          position="bottom-left"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#333",
              color: "#fff",
              borderRadius: "8px",
              padding: "8px 16px",
            },
          }}
        />
        <RouterProvider router={routes} />
      </HelmetProvider>
    </GoogleOAuthProvider>
  </Provider>,
);
