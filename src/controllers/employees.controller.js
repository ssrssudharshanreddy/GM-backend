import * as employeesService from '../services/employees.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';

export async function list(req, res) {
  const result = await employeesService.listEmployees(req.db, req.query);
  sendSuccess(res, result.employees, 200, { pagination: result.pagination });
}

export async function getById(req, res) {
  const emp = await employeesService.getEmployee(req.db, req.params.id);
  sendSuccess(res, emp);
}

export async function create(req, res) {
  const emp = await employeesService.createEmployee(req.db, req.body, req.user.role);
  sendCreated(res, emp);
}

export async function update(req, res) {
  const emp = await employeesService.updateEmployee(req.db, req.params.id, req.body);
  sendSuccess(res, emp);
}

export async function remove(req, res) {
  await employeesService.deleteEmployee(req.db, req.params.id, req.user.id);
  sendNoContent(res);
}
