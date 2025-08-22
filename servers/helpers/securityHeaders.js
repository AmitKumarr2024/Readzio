// servers/helpers/securityHeaders.js
export const setSecurityHeaders = (req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(self), microphone=(), camera=()"
  );
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "img-src 'self' data: https://*.instagram.com https://res.cloudinary.com https://*.google.com https://*.googlesyndication.com https://pagead2.googlesyndication.com; " +
      "script-src 'self' https://*.instagram.com 'unsafe-inline' https://*.google.com https://*.googlesyndication.com https://pagead2.googlesyndication.com; " +
      "frame-src 'self' https://*.instagram.com https://*.google.com https://*.googlesyndication.com https://pagead2.googlesyndication.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "connect-src 'self' https://*.instagram.com https://res.cloudinary.com https://*.google.com https://*.googlesyndication.com https://pagead2.googlesyndication.com"
  );
  next();
};
