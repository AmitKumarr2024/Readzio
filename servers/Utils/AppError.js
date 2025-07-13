export class AppError extends Error {
  constructor(message, statusCode = 500, context = 'Unknown') {
    super(message);
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
