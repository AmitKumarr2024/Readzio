import React from "react";
import AdsControlPanel from "../../../Ads/adsGaurd/AdsControlPanel";
// (later you can add analytics, charts, etc.)

const AdsDashboard = () => {
  return (
    <div className="space-y-8">
      <AdsControlPanel />

      {/* Future sections */}
      {/* <AdsAnalytics /> */}
      {/* <AdsHealth /> */}
    </div>
  );
};

export default AdsDashboard;
