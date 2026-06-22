import * as employeesRepo from '../repositories/employees.repository.js';
import * as authRepo from '../repositories/auth.repository.js';
import { Err } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export async function listEmployees(db, query) {
  const { data, count } = await employeesRepo.findAll(db, query);
  return {
    employees: data,
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }),
  };
}

export async function getEmployee(db, id) {
  const emp = await employeesRepo.findById(db, id);
  if (!emp) throw Err.notFound('Employee');
  return emp;
}

export async function createEmployee(db, body, actorRole) {
  if (actorRole !== 'CEO') throw Err.forbidden('Only CEO can create employees');

  // 1. Create auth.users entry (Supabase Auth)
  const authUser = await authRepo.createAuthUser({
    email: body.email,
    password: body.password,
    role: body.role,
    full_name: body.full_name,
  });

  // 2. Create employee_profiles row (id mirrors auth.users.id)
  const { password, email, ...profilePayload } = body;
  const profile = await employeesRepo.create(db, {
    id: authUser.id,
    ...profilePayload,
  });

  return profile;
}

export async function updateEmployee(db, id, body) {
  const emp = await employeesRepo.findById(db, id);
  if (!emp) throw Err.notFound('Employee');

  // If status changes to SUSPENDED/BLOCKED, update Supabase Auth as well
  if (body.status && body.status !== emp.status) {
    await authRepo.updateAuthUser(id, {
      ban_duration: body.status === 'ACTIVE' ? 'none' : '87600h',
    });
  }

  return employeesRepo.update(db, id, body);
}

export async function deleteEmployee(db, id, actorId) {
  if (id === actorId) throw Err.badRequest('Cannot delete your own account');
  const emp = await employeesRepo.findById(db, id);
  if (!emp) throw Err.notFound('Employee');

  await employeesRepo.softDelete(db, id);
  await authRepo.deleteAuthUser(id);
}
