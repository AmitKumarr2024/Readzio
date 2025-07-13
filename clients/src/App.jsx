import { useState, useEffect } from "react";
import { Outlet, useNavigation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ScrollToTop from "./Utils/ScrollToTop";
import SplashLoader from "./AppRootFile/components/SplashLoader";
import GoogleLoginPopup from "./AppRootFile/components/GoogleLoginPopup";
import BroadcastBanner from "./AppRootFile/components/BroadcastBanner";
import LocationErrorPopup from "./AppRootFile/components/LocationErrorPopup";
import PageTransitionLoader from "./AppRootFile/components/PageTransitionLoader";
import { useThemeSetup } from "./AppRootFile/hook/useThemeSetup";
import { useGeolocation } from "./AppRootFile/hook/useGeolocation";
import { useSocketInit } from "./AppRootFile/hook/useSocketInit";
import { useAdminAnalytics } from "./AppRootFile/hook/useAdminAnalytics";
import { useGoogleLoginPopup } from "./AppRootFile/hook/useGoogleLoginPopup";
import { useClearUserError } from "./AppRootFile/hook/useClearUserError";
import { useBannerExpiration } from "./AppRootFile/hook/useBannerExpiration";
import { useSelector, useDispatch } from "react-redux";
import { dismissBannerNotification } from "./store/adminSlice";
import { newNotificationReceived } from "./store/socketSlice";
import { useSocketConnectionStatus } from "./AppRootFile/hook/useSocketConnectionStatus";
import useAdBlockDetector from "./Ads/useAdBlockDetector";
import AdBlockWarning from "./Ads/AdBlockWarning";

export default function App() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [booting, setBooting] = useState(true);
  const isAdBlocked = useAdBlockDetector(); // Use the ad block detector hook

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "newNotification") {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed && parsed._id) {
              dispatch(newNotificationReceived(parsed));
            }
          } catch (err) {
            console.error("Failed to parse storage event:", err);
          }
        } else {
          dispatch(newNotificationReceived(null));
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

  const { newNotification } = useSelector((state) => state.socket);
  const isTransitionLoading = navigation.state === "loading";

  useEffect(() => {
    if (newNotification && newNotification._id && newNotification.expiresAt) {
      localStorage.setItem("newNotification", JSON.stringify(newNotification));
    } else {
      localStorage.removeItem("newNotification");
    }
  }, [newNotification]);

  const handleDismiss = async (notificationId) => {
    try {
      await dispatch(dismissBannerNotification(notificationId)).unwrap();
      dispatch(newNotificationReceived(null));
      localStorage.removeItem("newNotification");
    } catch (err) {
      console.error("Dismiss error:", err);
    }
  };

  if (booting) return <SplashLoader />;

  return (
    <div
      className={`min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark`}
    >
      {isAdBlocked && <AdBlockWarning />}
      <ScrollToTop />
      <Navbar />
      {showGooglePopup && <GoogleLoginPopup />}
      {newNotification && newNotification._id && (
        <BroadcastBanner
          newNotification={newNotification}
          handleDismiss={handleDismiss}
        />
      )}
      <PageTransitionLoader isLoading={isTransitionLoading} />
      <Outlet />
      <LocationErrorPopup locationError={locationError} onDismiss={() => {}} />
    </div>
  );
}
