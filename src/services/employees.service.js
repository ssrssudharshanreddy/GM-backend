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

  // Default to a valid initial password if not supplied
  const initialPassword = body.password || 'GangaMaxx@18';

  // 1. Create auth.users entry (Supabase Auth)
  const authUser = await authRepo.createAuthUser({
    email: body.email,
    password: initialPassword,
    role: body.role,
    full_name: body.full_name,
  });

  // 2. Create employee_profiles row (id mirrors auth.users.id)
  const { password, email, department, ...profilePayload } = body;
  
  if (department) {
    profilePayload.department_notes = department;
  }
  
  if (profilePayload.phone === '') {
    profilePayload.phone = null;
  }

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

  const { department, ...updatePayload } = body;
  if (department !== undefined) {
    updatePayload.department_notes = department;
  }
  if (updatePayload.phone === '') {
    updatePayload.phone = null;
  }

  return employeesRepo.update(db, id, updatePayload);
}

export async function deleteEmployee(db, id, actorId) {
  if (id === actorId) throw Err.badRequest('Cannot delete your own account');
  const emp = await employeesRepo.findById(db, id);
  if (!emp) throw Err.notFound('Employee');

  await employeesRepo.softDelete(db, id);
  await authRepo.deleteAuthUser(id);
}

export async function resetPassword(employeeId) {
  const { adminClient } = await import('../config/supabase.js');
  const { data: user, error: userErr } = await adminClient.auth.admin.getUserById(employeeId);
  if (userErr || !user?.user?.email) throw new Error('Employee not found in auth');
  const { error } = await adminClient.auth.resetPasswordForEmail(user.user.email);
  if (error) throw error;
}
