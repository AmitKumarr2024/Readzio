// src/hooks/useAdBlockDetector.js
import { useState, useEffect } from "react";

const useAdBlockDetector = () => {
  const [isAdBlocked, setIsAdBlocked] = useState(false);
  const [isBrave, setIsBrave] = useState(false);

  useEffect(() => {
    let isMounted = true;
    // Define the interval for re-checking (e.g., every 5 seconds)
    const CHECK_INTERVAL = 5000; // 5 seconds

    const detectAdBlocker = async () => {
      // ... (Rest of your detection logic remains the same) ...

      let detections = {
        domBlocked: false,
        scriptBlocked: false,
        fetchBlocked: false,
        isBraveBrowser: false,
      };

      // 1. Check if Brave browser first
      try {
        if (navigator.brave && typeof navigator.brave.isBrave === "function") {
          detections.isBraveBrowser = await navigator.brave.isBrave();
        }
      } catch (e) {
        // Not Brave
      }

      // Also check user agent as fallback
      if (!detections.isBraveBrowser) {
        detections.isBraveBrowser = /Brave/.test(navigator.userAgent);
      }

      // 2. DOM-based detection (multiple tests)
      const testElements = [
        { className: "adsbox ad-banner advertisement", id: "ad-test-1" },
        { className: "adsbygoogle sponsor-ads", id: "ad-test-2" },
        { className: "ad ads pub_300x250", id: "ad-test-3" },
      ];

      for (const test of testElements) {
        const adDiv = document.createElement("div");
        adDiv.className = test.className;
        adDiv.id = test.id;
        adDiv.style.cssText =
          "height: 1px !important; width: 1px !important; position: absolute !important; top: -9999px !important; left: -9999px !important;";
        document.body.appendChild(adDiv);

        await new Promise((resolve) => {
          setTimeout(() => {
            const styles = window.getComputedStyle(adDiv);
            if (
              styles.display === "none" ||
              styles.visibility === "hidden" ||
              adDiv.offsetHeight === 0 ||
              adDiv.offsetWidth === 0
            ) {
              detections.domBlocked = true;
            }
            adDiv.remove();
            resolve();
          }, 50);
        });
      }

      // Wait for DOM tests
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 3. Script loading detection (Google AdSense)
      detections.scriptBlocked = await new Promise((resolve) => {
        const testScript = document.createElement("script");
        testScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?v=${Date.now()}`;
        testScript.async = true;

        const timeout = setTimeout(() => {
          testScript.remove();
          resolve(true); // Blocked
        }, 3000);

        testScript.onload = () => {
          clearTimeout(timeout);
          testScript.remove();
          resolve(false); // Not blocked
        };

        testScript.onerror = () => {
          clearTimeout(timeout);
          testScript.remove();
          resolve(true); // Blocked
        };

        document.head.appendChild(testScript);
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

      // 5. Additional Brave-specific checks
      if (detections.isBraveBrowser) {
        // Check for Brave Shields indicators
        const braveCheck = document.createElement("div");
        braveCheck.className = "brave-ad-block-test";
        braveCheck.style.cssText =
          "height: 1px; width: 1px; position: absolute; top: -9999px;";
        document.body.appendChild(braveCheck);

        await new Promise((resolve) => {
          setTimeout(() => {
            if (braveCheck.offsetHeight === 0) {
              detections.domBlocked = true;
            }
            braveCheck.remove();
            resolve();
          }, 100);
        });
      }

      // Determine if ads are blocked
      const isBlocked =
        detections.domBlocked ||
        detections.scriptBlocked ||
        detections.fetchBlocked;

      if (isMounted) {
        setIsAdBlocked(isBlocked);
        setIsBrave(detections.isBraveBrowser);
      }
    };

    // Initial check (after a delay)
    const initialTimeoutId = setTimeout(() => {
      detectAdBlocker();
    }, 1000);

    // Set up interval for re-checking
    const intervalId = setInterval(() => {
      detectAdBlocker();
    }, CHECK_INTERVAL);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeoutId);
      // Clean up the interval when the component unmounts
      clearInterval(intervalId);
    };
  }, []); // The dependency array remains empty

  return { isAdBlocked, isBrave };
};

export default useAdBlockDetector;
