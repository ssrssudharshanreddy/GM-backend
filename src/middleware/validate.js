/**
 * Zod validation middleware factory.
 * Validates req.body, req.query, or req.params against a Zod schema.
 * Attaches the parsed (coerced) value back so controllers receive clean data.
 */
export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(result.error);
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true
    });
    next();
  };
}

export function validateParams(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) return next(result.error);
    Object.defineProperty(req, 'params', {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true
    });
    next();
  };
}
