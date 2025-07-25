import GoogleAd from "./GoogleAd";

const InArticleAd = ({ postId, testMode = false }) => (
  <GoogleAd
    adSlot="4935470124"
    adFormat="in-article"
    postId={postId}
    testMode={testMode}
    style={{ display: "block", width: "100%", height: "auto" }}
  />
);

export default InArticleAd;
