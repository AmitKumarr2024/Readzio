// src/utils/withSuspense.js (or src/Utils/withSuspense.js – pick one and stick with it)
import React, { Suspense } from "react";
import SplashLoader from "../AppRootFile/components/SplashLoader";

/**
 * Wrap a lazy-loaded component with a Suspense boundary.
 * @param {React.LazyExoticComponent} Component - The lazy-loaded component
 * @param {React.ReactNode} [fallback=<SplashLoader />] - Optional fallback UI
 */
const withSuspense = (Component, fallback = <SplashLoader />) => {
  return (props) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};

export default withSuspense;
