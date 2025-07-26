// utils/withSuspense.js
import React, { Suspense } from "react";
import SplashLoader from "../AppRootFile/components/SplashLoader";

const withSuspense = (Component) => (props) =>
  (
    <Suspense fallback={<SplashLoader />}>
      <Component {...props} />
    </Suspense>
  );

export default withSuspense;
