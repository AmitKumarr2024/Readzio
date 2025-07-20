// utils/AppError.js

/**
 * Custom Error class to throw operational (known) errors in your app.
 * These are NOT system or crash errors but expected issues (e.g., invalid input, auth failure).
 */
export class AppError extends Error {
  /**
   * 
   * @param {string} message - Developer/debug message (technical details).
   * @param {number} statusCode - HTTP status code (e.g., 400, 401, 500).
   * @param {string} context - Where the error occurred (e.g., 'LoginController', 'MongoDB').
   * @param {string} [userMessage] - Optional user-safe message to show in UI.
   */
  constructor(message, statusCode = 500, context = 'Unknown', userMessage) {
    super(message); // sets error.message
    this.name = this.constructor.name;

    // HTTP status (e.g., 400 Bad Request, 500 Server Error)
    this.statusCode = statusCode;

    // Context to help identify the module or logic area (e.g., 'AuthService', 'Database')
    this.context = context;

    // Optional user-friendly message to return in API response
    this.userMessage = userMessage || 'Something went wrong. Please try again later.';

    // Indicates whether this is an expected (operational) error vs. programming error
    this.isOperational = true;

    // Capture stack trace (without including constructor)
    Error.captureStackTrace(this, this.constructor);
  }
}
