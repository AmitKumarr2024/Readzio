import React, { useEffect, useRef } from 'react';
import useAdBlockDetector from './useAdBlockDetector';
import { useSelector } from 'react-redux';
import { selectSocketState } from '../store/socketSlice';

const GoogleAd = ({ adSlot, adFormat = 'auto', className = '', postId }) => {
  const isAdBlocked = useAdBlockDetector();
  const { socketInstance } = useSelector(selectSocketState) || {};
  const adRef = useRef(null);
  const impressionSent = useRef(false);

  useEffect(() => {
    if (isAdBlocked || impressionSent.current || !socketInstance?.connected) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionSent.current) {
          impressionSent.current = true;

          socketInstance.emit('adImpression', {
            postId,
            adIndex: adSlot,
            adSlot,
            timeSpent: 30,
          });

          try {
            if (typeof window !== 'undefined') {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
          } catch (e) {
            console.warn('[GoogleAd] AdSense error:', e);
          }
        }
      },
      { threshold: 0.5 }
    );

    if (adRef.current) observer.observe(adRef.current);

    return () => observer.disconnect();
  }, [adSlot, postId, isAdBlocked, socketInstance]);

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle block ${className}`}
      style={{ display: 'block' }}
      // data-ad-client="ca-pub-8408980890451581"
      // data-ad-slot={adSlot}
      // data-ad-format={adFormat}
      // data-full-width-responsive="true"
    />
  );
};

export default GoogleAd;
