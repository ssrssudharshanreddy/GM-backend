/**
 * Attach res.success() and res.paginated() helpers to every response.
 * Usage: app.use(responseHelper)
 *
 * Or call the standalone functions directly in controllers.
 */

export function sendSuccess(res, data = null, statusCode = 200, meta = {}) {
  return res.status(statusCode).json({ success: true, data, ...meta });
}

export function sendCreated(res, data = null) {
  return sendSuccess(res, data, 201);
}

export function sendPaginated(res, data, pagination) {
  return res.status(200).json({ success: true, data, pagination });
}

export function sendNoContent(res) {
  return res.status(204).end();
}
