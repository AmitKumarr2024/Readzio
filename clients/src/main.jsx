import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "react-router-dom";
import routes from "./routers/routes.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Provider } from "react-redux";
import store from "./store/store.js";

// Renders app with Redux, Google OAuth, and routing
createRoot(document.getElementById("root")).render(

    <Provider store={store}>
      {" "}
      {/* Redux store provider */}
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        {" "}
        {/* Google OAuth setup */}
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
        {/* Toast notifications */}
        <RouterProvider router={routes} /> {/* App routes */}
      </GoogleOAuthProvider>
    </Provider>

);
