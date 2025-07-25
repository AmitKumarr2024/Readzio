import GoogleAd from "./GoogleAd";

const MultiplexAd = ({ postId}) => (
  <div className=" w-full p-3 overflow-hidden">
    <div className="flex justify-center items-center w-full">
      <GoogleAd
        adSlot="9884544478"
        adFormat="multiplex"
        postId={postId}
        
        style={{
          display: "block",
          width: "100%",
          maxWidth: "100%",
          minHeight: "250px",
          height: "auto",

        }}
      />
    </div>
    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
      Sponsored
    </p>
  </div>
);

export default MultiplexAd;
