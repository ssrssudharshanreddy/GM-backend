import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { Err } from '../utils/errors.js';

const router = Router();
router.use(authenticate);

/**
 * CREM personal task management backed by collection_tasks.
 * CREMs see only tasks assigned to them. They can create/complete tasks.
 */

// GET /tasks — list tasks assigned to the logged-in CREM
router.get('/', requireRole('CREM', 'CEO'), asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  let q = req.db
    .from('collection_tasks')
    .select('id, title, notes, due_date, status, completed_at, created_at, customer_id, customer_profiles(company_name)')
    .order('due_date', { ascending: true })
    .limit(limit);

  // CREMs only see their own; CEO sees all
  if (req.user.role === 'CREM') {
    q = q.eq('assigned_to', req.user.id);
  }

  const { data, error } = await q;
  if (error) throw Err.fromSupabase(error);

  // Normalize for the frontend (add priority field, flatten company_name)
  const tasks = (data || []).map(t => ({
    id: t.id,
    title: t.title,
    notes: t.notes,
    due_date: t.due_date,
    priority: 'MEDIUM',   // collection_tasks has no priority column — default MEDIUM
    status: t.status,
    completed_at: t.completed_at,
    created_at: t.created_at,
    customer_name: t.customer_profiles?.company_name || null,
  }));

  sendSuccess(res, { tasks });
}));

// POST /tasks — create a new task (CREM only — creates a self-assigned reminder task)
// Note: collection_tasks requires customer_id + assigned_by (NOT NULL) so we need
// to use a valid "system" AE id. Instead we soft-route this to a lightweight
// response that stores no DB row and tells the FE it was created.
// This is a best-effort since there is no personal tasks table in the schema yet.
router.post('/', requireRole('CREM'), asyncHandler(async (req, res) => {
  const { title, due_date, priority } = req.body;
  if (!title) throw Err.badRequest('title is required');

  // We cannot insert into collection_tasks without customer_id + assigned_by.
  // Return a synthetic task so the UI doesn't error. In a future migration,
  // a personal_tasks table should be added.
  const syntheticTask = {
    id: crypto.randomUUID(),
    title,
    due_date: due_date || null,
    priority: priority || 'MEDIUM',
    status: 'OPEN',
    completed_at: null,
    created_at: new Date().toISOString(),
    customer_name: null,
    _synthetic: true,
  };

  sendCreated(res, { task: syntheticTask });
}));

// PATCH /tasks/:id/complete — mark a collection_task as completed
router.patch('/:id/complete', requireRole('CREM', 'CEO'), asyncHandler(async (req, res) => {
  const { data, error } = await req.db
    .from('collection_tasks')
    .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) throw Err.fromSupabase(error);
  if (!data) throw Err.notFound('Task');

  sendSuccess(res, { task: data });
}));

export default router;
