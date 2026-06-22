/**
 * Supabase range-based pagination helper.
 * Returns { from, to, limit, page } and a pagination meta object.
 */
export function getPagination(query, defaults = { page: 1, limit: 20 }) {
  const page = Math.max(1, parseInt(query.page) || defaults.page);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaults.limit));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to, limit, page };
}

/**
 * Build the pagination meta returned to clients.
 */
export function buildPaginationMeta({ page, limit, total }) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Apply common query filters from request query params.
 * Filters: page, limit, search, sortBy, sortDir, status, dateFrom, dateTo
 */
export function applyFilters(supabaseQuery, q, allowedFilters = []) {
  if (allowedFilters.includes('status') && q.status) {
    supabaseQuery = supabaseQuery.eq('status', q.status);
  }
  if (allowedFilters.includes('dateFrom') && q.dateFrom) {
    supabaseQuery = supabaseQuery.gte('created_at', q.dateFrom);
  }
  if (allowedFilters.includes('dateTo') && q.dateTo) {
    supabaseQuery = supabaseQuery.lte('created_at', q.dateTo);
  }
  if (allowedFilters.includes('search') && q.search) {
    supabaseQuery = supabaseQuery.ilike('company_name', `%${q.search}%`);
  }
  return supabaseQuery;
}
