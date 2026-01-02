import { useAds } from "../useAds";

const AdGuard = ({ placement, children }) => {
  const canShow = useAds(placement);
  return canShow ? children : null;
};

export default AdGuard;
