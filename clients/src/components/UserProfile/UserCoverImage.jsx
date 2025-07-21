import { useState } from "react";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import Skeleton from "../ui/Skeleton";

export default function UserCoverImage({ src, alt, loading }) {
  const [loaded, setLoaded] = useState(false);

  if (loading) {
    return (
      <AspectRatio ratio={16 / 9} className="rounded-xl overflow-hidden shadow-md bg-gray-200">
        <Skeleton width="w-full" height="h-full" rounded="rounded-xl" />
      </AspectRatio>
    );
  }

  return (
    <AspectRatio ratio={16 / 9} className="rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-gray-100">
      <img
        src={src}
        alt={alt}
        className={`object-cover w-full h-full transition-opacity duration-700 ease-in-out ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
      />
    </AspectRatio>
  );
}
