import AdGuard from "./adsGaurd/AdGuard";
import CardAd from "./CardAd";

const AdCard = ({ postId }) => (
  <AdGuard placement="card">
    <div className="group relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg overflow-hidden h-full">
      <CardAd postId={postId} />
    </div>
  </AdGuard>
);

export default AdCard;
