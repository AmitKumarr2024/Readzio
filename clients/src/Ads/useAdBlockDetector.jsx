// src/hooks/useAdBlockDetector.js
import { useState, useEffect } from "react";

const useAdBlockDetector = () => {
  const [isAdBlocked, setIsAdBlocked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAdBlock = async () => {
      const bait = document.createElement("div");
      bait.className = "adsbox";
      bait.style.height = "1px";
      bait.style.position = "absolute";
      bait.style.top = "-1000px";
      document.body.appendChild(bait);

      let networkBlocked = false;
      try {
        await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
          method: "HEAD",
          mode: "no-cors",
        });
      } catch {
        networkBlocked = true;
      }

      setTimeout(() => {
        if (isMounted) {
          const domBlocked = bait.offsetHeight === 0;
          setIsAdBlocked(domBlocked || networkBlocked);
          document.body.removeChild(bait);
        }
      }, 100);
    };

    checkAdBlock();

    return () => {
      isMounted = false;
    };
  }, []);

  return isAdBlocked;
};

export default useAdBlockDetector;
