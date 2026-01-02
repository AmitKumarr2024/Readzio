// AppRootFile/hook/useAdsConfigInit.js
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchAdsSettings } from "../store/adsSlice";

export const useAdsConfigInit = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchAdsSettings());
  }, [dispatch]);
};
