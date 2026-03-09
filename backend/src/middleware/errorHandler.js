/**
 * Centralised error handler – catches all errors passed via next(err).
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err.message);

  // Postgres unique violation
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Duplicate entry – resource already exists.' });
  }

  // Postgres foreign-key violation
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Referenced resource does not exist.' });
  }

  const status  = err.statusCode || err.status || 500;
  const message = err.message    || 'Internal server error';

  res.status(status).json({ success: false, message });
}

module.exports = { errorHandler };
