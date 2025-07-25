import GoogleAd from "./GoogleAd";

const MultiplexAd = ({ postId, testMode = false }) => (
  <GoogleAd
    adSlot="9884544478"
    adFormat="multiplex"
    postId={postId}
    testMode={testMode}
    style={{ display: "block", width: "100%", height: "auto" }}
  />
);

export default MultiplexAd;
