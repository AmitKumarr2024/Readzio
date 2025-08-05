// src/components/ErrorFallback.jsx
import React from "react";
import { useEffect } from "react";

export default function ErrorFallback({ error }) {
    
  useEffect(() => {
    if (
      error?.message?.includes("Failed to fetch dynamically imported module")
    ) {
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Auto-refresh after 1.5s
    }
  }, [error]);

  return (
    <div style={{ padding: "2rem", color: "red", textAlign: "center" }}>
      <h2>Something went wrong!</h2>
      <p>{error?.message || "An unknown error occurred."}</p>
      <button onClick={() => window.location.reload()}>Reload Page</button>
    </div>
  );
}
