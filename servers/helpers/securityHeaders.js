// servers/middleware/securityHeaders.js
export const setSecurityHeaders = (req, res, next) => {
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https://*.instagram.com https://res.cloudinary.com; script-src 'self' https://*.instagram.com 'unsafe-inline'; frame-src 'self' https://*.instagram.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.instagram.com https://res.cloudinary.com"
  );
  next();
};