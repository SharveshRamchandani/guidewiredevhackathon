/**
 * AppError — Standard GigShield error class
 * Thrown by service functions, caught by global error handler.
 */
class AppError extends Error {
  /**
   * @param {string} code       - Machine-readable error code
   * @param {string} message    - Human-readable message
   * @param {number} statusCode - HTTP status
   * @param {number} [retryAfter] - Optional retry-after seconds
   */
  constructor(code, message, statusCode = 500, retryAfter) {
    super(message);
    this.code = code;
    this.message = message;
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
    this.name = 'AppError';
  }
}

/**
 * Global Express error handler.
 * All thrown errors funnel through here.
 */
function errorHandler(err, req, res, next) {
  // Structured AppError
  if (err.code && err.statusCode) {
    const body = {
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.retryAfter) body.error.retryAfter = err.retryAfter;
    return res.status(err.statusCode).json(body);
  }

  // Express-validator errors (legacy format)
  if (err.isJoi || (err.errors && Array.isArray(err.array))) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: err.message }
    });
  }

  // Postgres constraint violations
  if (err.code === '23505') {
    return res.status(409).json({
      error: { code: 'DUPLICATE_ENTRY', message: 'A record with this data already exists.' }
    });
  }
  if (err.code === '23503') {
    return res.status(400).json({
      error: { code: 'INVALID_REFERENCE', message: 'Referenced record does not exist.' }
    });
  }

  // Legacy format (old services that use err.statusCode without err.code)
  if (err.statusCode && err.statusCode < 500) {
    return res.status(err.statusCode).json({
      error: { code: 'CLIENT_ERROR', message: err.message }
    });
  }

  // Default 500 — do NOT leak stack trace or internal details
  if (process.env.NODE_ENV !== 'production') {
    console.error('[500] Unhandled error:', err);
  } else {
    console.error(`[500] ${err.message}`);
  }

  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again.' }
  });
}

module.exports = { AppError, errorHandler };
