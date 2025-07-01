import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { recordAdEarnings } from '../store/adsSlice';
import useAdBlockDetector from '../hooks/useAdBlockDetector';
import { socketInstance } from '../store/socketSlice';

const GoogleAd = ({ adSlot, adFormat = 'auto', className = '', postId }) => {
  const dispatch = useDispatch();
  const isAdBlocked = useAdBlockDetector();
  const { loading, error } = useSelector((state) => state.ads || {});
  const adRef = useRef(null);
  const impressionSent = useRef(false);

  useEffect(() => {
    if (isAdBlocked || loading || error || impressionSent.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionSent.current) {
          impressionSent.current = true;
          dispatch(recordAdEarnings({
            postId,
            adSlot,
            adIndex: adSlot,
            timeSpent: 30,
            orderId: `order_${adSlot}_${Date.now()}`,
            paymentId: `pay_${adSlot}_${Date.now()}`,
            signature: `sig_${adSlot}_${Date.now()}`,
          }));

          socketInstance?.emit('adImpression', {
            postId,
            adIndex: adSlot,
            adSlot,
            timeSpent: 30,
          });
          console.log('[GoogleAd] Emitted adImpression', { postId, adSlot });

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
  }, [dispatch, adSlot, postId, isAdBlocked, loading, error]);

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle block ${className}`}
      style={{ display: 'block' }}
      data-ad-client="ca-pub-XXXXXXXXXXXXXX"
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive="true"
    />
  );
};

export default GoogleAd;