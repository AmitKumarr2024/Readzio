import { useState } from "react";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import Skeleton from "../Ui/Skeleton";

export default function UserAvatar({ src, alt, loading }) {
  const [loaded, setLoaded] = useState(false);

  if (loading) {
    return (
      <div  className="w-24 md:w-48 rounded-full overflow-hidden bg-gray-200 shadow-inner">
        <Skeleton width="w-full" height="h-full" rounded="rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-28 md:h-46 h-28 md:w-46 rounded-full overflow-hidden shadow-lg border-4 border-gray-200 cursor-pointer transition-transform duration-300 ease-in-out hover:scale-105 ">
      <img
        src={src}
        alt={alt}
        className={`object-cover w-full h-full aspect-ratio:4/1 transition-opacity  duration-700 ease-in-out ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
