import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { saveUserConsent } from "../../store/userSlice";

// CookieConsentBar component to prompt user for cookie consent
// Displays banner if consent is undecided; saves choice to Redux and localStorage
export default function CookieConsentBar() {
  // Initialize Redux dispatch for action handling
  const dispatch = useDispatch();
  // Get cookie consent status from Redux store (null, true, or false)
  const consent = useSelector((state) => state.user.cookieConsent);

  // Effect to sync consent to localStorage when updated
  // - Runs when consent changes
  // - Stores consent in localStorage for persistence
  useEffect(() => {
    if (consent !== null) {
      try {
        localStorage.setItem("userCookieConsent", consent);
      } catch (e) {
        // Log localStorage errors for debugging
        console.warn("[CookieConsentBar] localStorage error:", e);
      }
    }
  }, [consent]);

  // Hide banner if consent is already set (true or false)
  if (consent !== null) return null;

  // Handle user consent choice (accept/decline)
  // - Dispatches saveUserConsent to update Redux and trigger backend call
  // - Integrates with POST /consent in userRoutes.js
  const handleConsent = (value) => {
    try {
      dispatch(saveUserConsent(value));
    } catch (e) {
      // Log dispatch errors for debugging
      console.warn("[CookieConsentBar] Dispatch error:", e);
    }
  };

  return (
    // Fixed bottom banner for cookie consent prompt
    // - Responsive layout with flexbox for mobile/desktop
    // - Z-index ensures visibility over other elements
    <div className="fixed bottom-0 inset-x-0 bg-white text-black text-base px-6 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center border-t border-gray-300 shadow-md z-50">
      <div className="mb-3 sm:mb-0">
        This site uses cookies.{" "}
        <Link to="/privacy" className="underline ml-1 hover:opacity-80">
          Learn more
        </Link>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => handleConsent(true)}
          className="bg-black text-white text-base px-5 py-2 rounded hover:opacity-90 transition"
        >
          Accept
        </button>
        <button
          onClick={() => handleConsent(false)}
          className="bg-white text-black border border-black text-base px-5 py-2 rounded hover:opacity-90 transition"
        >
          Decline
        </button>
      </div>
    </div>
  );
}