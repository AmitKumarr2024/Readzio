import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ScrollToTop from "./Utils/ScrollToTop";
import SplashLoader from "./AppRootFile/components/SplashLoader";
import GoogleLoginPopup from "./AppRootFile/components/GoogleLoginPopup";
import BroadcastBanner from "./AppRootFile/components/BroadcastBanner";
import LocationErrorPopup from "./AppRootFile/components/LocationErrorPopup";
import { useThemeSetup } from "./AppRootFile/hook/useThemeSetup";
import { useGeolocation } from "./AppRootFile/hook/useGeolocation";
import { useSocketInit } from "./AppRootFile/hook/useSocketInit";
import { useAdminAnalytics } from "./AppRootFile/hook/useAdminAnalytics";
import { useGoogleLoginPopup } from "./AppRootFile/hook/useGoogleLoginPopup";
import { useClearUserError } from "./AppRootFile/hook/useClearUserError";
import { useBannerExpiration } from "./AppRootFile/hook/useBannerExpiration";
import { useSelector, useDispatch } from "react-redux";
import {
  newNotificationReceived,
  setFeedbackPrompt,
} from "./store/socketSlice";
import { useSocketConnectionStatus } from "./AppRootFile/hook/useSocketConnectionStatus";
import useAdBlockDetector from "./Ads/useAdBlockDetector";
import AdBlockWarning from "./Ads/AdBlockWarning";
import CookieConsentBanner from "./AppRootFile/components/CookieConsentBanner";
import FeedbackModal from "./AppRootFile/components/FeedbackModal";
import VerifyBanner from "./AppRootFile/components/VerifyBanner";
import AppTour from "./AppRootFile/components/AppTour";
import { dismissBannerNotification } from "./store/bannerNotificationSlice";
import { toast } from "react-hot-toast";
import LoadingBar from "./Utils/LoadingBar";

// ❌ REMOVED: import AdminDashboard from "./pages/Admin/Dashboard";

export default function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const [booting, setBooting] = useState(true);
  const [showThankYou, setShowThankYou] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const isAdBlocked = useAdBlockDetector();

  // ❌ REMOVED: Unused isAppLoading state
  // ❌ REMOVED: Unused AdminDashboard render block

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setRouteLoading(true);
    const timer = setTimeout(() => setRouteLoading(false), 600);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "newNotification") {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            if (parsed && parsed._id) {
              dispatch(newNotificationReceived(parsed));
            }
          } else {
            dispatch(newNotificationReceived(null));
          }
        } catch (err) {
          console.error("[App] Storage event parse error:", err);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [dispatch]);

  const theme = useThemeSetup();
  const locationError = useGeolocation();
  const showGooglePopup = useGoogleLoginPopup();
  useSocketConnectionStatus();
  useSocketInit();
  useAdminAnalytics();
  useClearUserError();
  useBannerExpiration();

  const { newNotification, feedbackPrompt } = useSelector(
    (state) => state.socket
  );

  useEffect(() => {
    try {
      if (newNotification && newNotification._id && newNotification.expiresAt) {
        localStorage.setItem(
          "newNotification",
          JSON.stringify(newNotification)
        );
      } else {
        localStorage.removeItem("newNotification");
      }
    } catch (e) {
      console.error("[App] localStorage error:", e);
    }
  }, [newNotification]);

  const handleDismiss = async (notificationId) => {
    dispatch(newNotificationReceived(null));
    localStorage.removeItem("newNotification");

    try {
      await dispatch(dismissBannerNotification(notificationId)).unwrap();
      toast.success("Notification dismissed");
    } catch (err) {
      console.error("[App] Dismiss error:", err);
      toast.error("Failed to dismiss notification");
      if (newNotification) {
        dispatch(newNotificationReceived(newNotification));
        localStorage.setItem(
          "newNotification",
          JSON.stringify(newNotification)
        );
      }
    }
  };

  const handleCloseFeedback = () => {
    setShowThankYou(true);
    dispatch(setFeedbackPrompt(null));
    setTimeout(() => setShowThankYou(false), 2000);
  };

  if (booting) return <SplashLoader />;

  return (
    <div
      className={`min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark`}
    >
      {isAdBlocked && <AdBlockWarning />}
      <ScrollToTop />
      <AppTour />
      <Navbar />
      <VerifyBanner />

      {showGooglePopup && <GoogleLoginPopup />}
      {newNotification && newNotification._id && (
        <BroadcastBanner
          newNotification={newNotification}
          handleDismiss={handleDismiss}
        />
      )}
      {feedbackPrompt && (
        <FeedbackModal
          isOpen={true}
          message={feedbackPrompt?.message}
          onClose={handleCloseFeedback}
        />
      )}
      {showThankYou && (
        <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg">
          Thank you for your feedback!
        </div>
      )}
      {routeLoading && (
        <LoadingBar
          loading={routeLoading}
          text="Opening your reading world..."
        />
      )}

      <Outlet />
      <LocationErrorPopup locationError={locationError} onDismiss={() => {}} />
      <CookieConsentBanner />
    </div>
  );
}
