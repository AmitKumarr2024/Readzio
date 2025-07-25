import GoogleAd from "./GoogleAd";

const DisplayAd = ({ testMode = false }) => (
  <GoogleAd
    adSlot="6440123489"
    adFormat="auto"
    testMode={testMode}
    style={{ display: "block", width: "100%", height: "auto" }}
  />
);

export default DisplayAd;
