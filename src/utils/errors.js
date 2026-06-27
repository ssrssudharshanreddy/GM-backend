/**
 * Operational errors thrown deliberately.
 * Unhandled errors from DB / third-party are caught by the global error handler.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const Err = {
  notFound: (entity = 'Resource') => new AppError(`${entity} not found`, 404, 'NOT_FOUND'),
  forbidden: (msg = 'Access denied') => new AppError(msg, 403, 'FORBIDDEN'),
  unauthorized: (msg = 'Unauthorized') => new AppError(msg, 401, 'UNAUTHORIZED'),
  badRequest: (msg) => new AppError(msg, 400, 'BAD_REQUEST'),
  conflict: (msg) => new AppError(msg, 409, 'CONFLICT'),
  unprocessable: (msg) => new AppError(msg, 422, 'UNPROCESSABLE'),
  internal: (msg = 'Internal server error') => new AppError(msg, 500, 'INTERNAL'),

  /** Translate a Supabase PostgREST / auth error into an AppError */
  fromSupabase(error) {
    if (!error) return null;
    const msg = error.message || 'Database error';
    // RLS violations surface as 403-ish
    if (error.code === 'PGRST301' || msg.includes('permission denied')) {
      return new AppError('Access denied', 403, 'FORBIDDEN');
    }
    // Row not found
    if (error.code === 'PGRST116') {
      return new AppError('Resource not found', 404, 'NOT_FOUND');
    }
    // Unique violation
    if (error.code === '23505') {
      return new AppError('Duplicate entry — resource already exists', 409, 'CONFLICT');
    }
    // Check constraint (e.g. credit check, format)
    if (error.code === '23514' || error.code === 'P0001') {
      return new AppError(msg, 422, 'CONSTRAINT_VIOLATION');
    }
    // Foreign key violation
    if (error.code === '23503') {
      return new AppError('Cannot delete or update because it is in use by other records.', 409, 'FOREIGN_KEY_VIOLATION');
    }
    return new AppError(msg, 500, 'DB_ERROR');
  },
};
