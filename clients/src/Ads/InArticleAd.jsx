import GoogleAd from "./GoogleAd";

const InArticleAd = ({ postId}) => (
  <GoogleAd
    adSlot="4935470124"
    adFormat="in-article"
    postId={postId}
    
    style={{ display: "block", width: "100%", height: "auto" }}
  />
);

export default InArticleAd;
