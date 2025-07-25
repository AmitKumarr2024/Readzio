import GoogleAd from "./GoogleAd";

const InFeedAd = ({ postId, testMode = false }) => (
  <GoogleAd
    adSlot="8028537328"
    adFormat="autorelaxed"
    postId={postId}
    testMode={testMode}
    style={{ display: "block", width: "100%", height: "auto" }}
  />
);

export default InFeedAd;
