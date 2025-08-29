import GoogleAd from "./GoogleAd";

const MultiplexAd = ({ postId }) => (
  <div className="w-full p-3 overflow-hidden">
    {/* Reserve fixed height to avoid CLS */}
    <div
      className="flex justify-center items-center w-full"
      style={{
        minHeight: "280px", // reserve space for multiplex ad
        maxHeight: "400px", // optional upper bound
      }}
    >
      <GoogleAd
        adSlot="9884544478"
        adFormat="multiplex"
        postId={postId}
        style={{
          display: "block",
          width: "100%",
          maxWidth: "100%",
          height: "100%", // take the reserved space
        }}
      />
    </div>
    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
      Sponsored
    </p>
  </div>
);

export default MultiplexAd;
