// src/hooks/useAdBlockDetector.js
import { useState, useEffect } from "react";

const useAdBlockDetector = () => {
  const [isAdBlocked, setIsAdBlocked] = useState(false);
  const [isBrave, setIsBrave] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const detectAdBlock = async () => {
      let blocked = false;

      // ✅ Detect Brave Browser
      let braveCheck = false;
      try {
        if (navigator.brave && typeof navigator.brave.isBrave === "function") {
          braveCheck = await navigator.brave.isBrave();
        }
      } catch {}
      if (!braveCheck) {
        braveCheck = /Brave/.test(navigator.userAgent);
      }
      setIsBrave(braveCheck);

      // ✅ Try generic known ad request (this is BLOCKED by Brave Shields)
      try {
        await fetch("https://static.doubleclick.net/instream/ad_status.js", {
          method: "HEAD",
          mode: "no-cors",
        });
      } catch (err) {
        blocked = true;
      }

      // ✅ DOM-based check as fallback (in case fetch false-negatives)
      const adDiv = document.createElement("div");
      adDiv.className = "adsbox adbanner ad-unit";
      adDiv.style.height = "1px";
      document.body.appendChild(adDiv);

      setTimeout(() => {
        const computed = window.getComputedStyle(adDiv);
        if (
          adDiv.offsetHeight === 0 ||
          computed.display === "none" ||
          computed.visibility === "hidden"
        ) {
          blocked = true;
        }
        adDiv.remove();

        if (isMounted) {
          setIsAdBlocked(blocked);
        }
      }, 150);
    };

    detectAdBlock();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isAdBlocked, isBrave };
};

export default useAdBlockDetector;
