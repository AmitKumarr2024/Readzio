import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { saveUserConsent } from "../../store/userSlice";

export default function CookieConsentBar() {
  const dispatch = useDispatch();
  const consent = useSelector((state) => state.user?.cookieConsent ?? null);

  // Only hide if consent already exists
  if (consent !== null) return null;

  const handleConsent = (value) => {
    try {
      localStorage.setItem("userCookieConsent", value);
    } catch (e) {
      console.warn("[CookieConsentBar] localStorage error:", e);
    }
    dispatch(saveUserConsent(value));
  };

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white text-black text-base px-6 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center border-t border-gray-300 shadow-md z-50">
      <div className="mb-3 sm:mb-0 text-sm sm:text-base">
        We use cookies and similar technologies to improve your experience,
        analyze site traffic, personalize content, and show relevant ads.
        Cookies also help us remember your preferences and keep you logged in.
        By continuing to browse, you consent to our use of cookies.{" "}
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
