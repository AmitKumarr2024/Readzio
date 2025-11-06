// src/hooks/useAdBlockDetector.js
import { useState, useEffect } from "react";

const useAdBlockDetector = () => {
  const [isAdBlocked, setIsAdBlocked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAdBlock = async () => {
      let detections = {
        domBlocked: false,
        scriptBlocked: false,
        fetchBlocked: false,
        isBrave: false,
      };

      // 1. Check if Brave browser
      try {
        if (navigator.brave && typeof navigator.brave.isBrave === "function") {
          detections.isBrave = await navigator.brave.isBrave();
        }
      } catch (e) {
        // Not Brave
      }

      // Fallback: Check user agent
      if (!detections.isBrave) {
        detections.isBrave = /Brave/.test(navigator.userAgent);
      }

      // 2. Multiple DOM-based detection tests
      const testClasses = [
        "adsbox ad-banner advertisement",
        "adsbygoogle sponsor-ads",
        "ad ads pub_300x250",
      ];

      for (const className of testClasses) {
        const bait = document.createElement("div");
        bait.className = className;
        bait.style.cssText =
          "height: 1px !important; width: 1px !important; position: absolute !important; top: -9999px !important; left: -9999px !important;";
        document.body.appendChild(bait);

        // Check immediately
        const styles = window.getComputedStyle(bait);
        if (
          styles.display === "none" ||
          styles.visibility === "hidden" ||
          bait.offsetHeight === 0 ||
          bait.offsetWidth === 0
        ) {
          detections.domBlocked = true;
        }

        // Cleanup
        if (bait.parentNode) {
          document.body.removeChild(bait);
        }

        if (detections.domBlocked) break; // No need to test more
      }

      // 3. Script loading detection
      detections.scriptBlocked = await new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?t=${Date.now()}`;
        script.async = true;

        const timeout = setTimeout(() => {
          script.remove();
          resolve(true); // Assume blocked
        }, 3000);

        script.onload = () => {
          clearTimeout(timeout);
          script.remove();
          resolve(false); // Not blocked
        };

        script.onerror = () => {
          clearTimeout(timeout);
          script.remove();
          resolve(true); // Blocked
        };

        document.head.appendChild(script);
      });

      // 4. Fetch-based detection
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        await fetch(
          "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
          {
            method: "HEAD",
            mode: "no-cors",
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);
        detections.fetchBlocked = false;
      } catch (error) {
        detections.fetchBlocked = true;
      }

      // 5. Brave-specific check
      if (detections.isBrave) {
        const braveTest = document.createElement("div");
        braveTest.className = "brave-ad-test";
        braveTest.style.cssText =
          "height: 1px; width: 1px; position: absolute; top: -9999px;";
        document.body.appendChild(braveTest);

        setTimeout(() => {
          if (braveTest.offsetHeight === 0) {
            detections.domBlocked = true;
          }
          if (braveTest.parentNode) {
            braveTest.remove();
          }
        }, 100);
      }

      // Wait for all async checks
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Final determination
      if (isMounted) {
        const isBlocked =
          detections.domBlocked ||
          detections.scriptBlocked ||
          detections.fetchBlocked;
        setIsAdBlocked(isBlocked);
      }
    };

    // Delay initial check to ensure page is loaded
    const timeoutId = setTimeout(() => {
      checkAdBlock();
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return isAdBlocked;
};

export default useAdBlockDetector;
