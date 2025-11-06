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

      // 2. Async DOM-based detection
      const domCheck = async () => {
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
          await new Promise((resolve) => requestAnimationFrame(resolve));
          await new Promise((resolve) => setTimeout(resolve, 100));
          const styles = window.getComputedStyle(bait);
          if (
            styles.display === "none" ||
            styles.visibility === "hidden" ||
            bait.offsetHeight === 0 ||
            bait.offsetWidth === 0
          ) {
            bait.remove();
            return true;
          }
          bait.remove();
        }
        return false;
      };
      detections.domBlocked = await domCheck();

      // 3. Script loading detection
      detections.scriptBlocked = await new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?t=${Date.now()}`;
        script.async = true;
        const timeout = setTimeout(() => {
          script.remove();
          resolve(true);
        }, 4000); // Increased for Brave
        script.onload = () => {
          clearTimeout(timeout);
          script.remove();
          resolve(false);
        };
        script.onerror = () => {
          clearTimeout(timeout);
          script.remove();
          resolve(true);
        };
        document.head.appendChild(script);
      });

      // 4. Fetch-based detection
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
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
      if (detections.isBrave && !detections.domBlocked) {
        const braveTest = document.createElement("div");
        braveTest.className = "brave-ad-test ads ad-banner";
        braveTest.style.cssText =
          "height: 1px; width: 1px; position: absolute; top: -9999px;";
        document.body.appendChild(braveTest);
        await new Promise((resolve) => setTimeout(resolve, 200));
        const styles = window.getComputedStyle(braveTest);
        if (
          styles.display === "none" ||
          styles.visibility === "hidden" ||
          braveTest.offsetHeight === 0
        ) {
          detections.domBlocked = true;
        }
        braveTest.remove();
      }

      // Wait briefly
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (isMounted) {
        const isBlocked =
          detections.domBlocked ||
          detections.scriptBlocked ||
          detections.fetchBlocked;
        setIsAdBlocked(isBlocked);
      }
    };

    setTimeout(checkAdBlock, 1500); // Increased delay

    return () => {
      isMounted = false;
    };
  }, []);

  return isAdBlocked;
};

export default useAdBlockDetector;
