// components/GoogleAd.jsx
import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import useAdBlockDetector from './useAdBlockDetector';
import { selectSocketState } from '../store/socketSlice';

/**
 * Universal Google AdSense Component
 * Supports: display, in-article, in-feed, multiplex
 */
const GoogleAd = ({
  adSlot,
  adClient = 'ca-pub-8408980890451581',
  adFormat = 'auto',
  layoutKey = null,
  className = '',
  style = { display: 'block', width: '100%', height: 'auto' },
  postId = null,
  responsive = true,
}) => {
  const isAdBlocked = useAdBlockDetector();
  const { socketInstance } = useSelector(selectSocketState);
  const adRef = useRef(null);
  const impressionSent = useRef(false);

  // 🔁 Always push ads on mount (fallback)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[GoogleAd] AdSense fallback error:', e);
        }
      }
    }
  }, []);

  // 👁️ Track visibility and send impression
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      isAdBlocked ||
      impressionSent.current ||
      !socketInstance?.connected
    )
      return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionSent.current) {
          impressionSent.current = true;

          if (postId) {
            socketInstance.emit('adImpression', {
              postId,
              adIndex: adSlot,
              adSlot,
              timeSpent: 30,
            });
          }

          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[GoogleAd] AdSense observer error:', e);
            }
          }
        }
      },
      { threshold: 0.1 } // more lenient
    );

    if (adRef.current) observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [adSlot, postId, isAdBlocked, socketInstance]);

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={style}
      data-ad-client={adClient}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      {...(layoutKey && { 'data-ad-layout-key': layoutKey })}
      {...(responsive && { 'data-full-width-responsive': 'true' })}
    />
  );
};

export default GoogleAd;
