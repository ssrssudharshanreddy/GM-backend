import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, isCEO, isInternal } from '../middleware/auth.js';
import * as employeesController from '../controllers/employees.controller.js';
import { createEmployeeSchema, updateEmployeeSchema, listEmployeesSchema } from '../schemas/employee.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();

router.use(authenticate);

router.get(  '/',    isInternal, validateQuery(listEmployeesSchema), asyncHandler(employeesController.list));
router.get(  '/:id', isInternal, validateParams(idParamSchema),      asyncHandler(employeesController.getById));
router.post( '/',    isCEO,      validateBody(createEmployeeSchema),  asyncHandler(employeesController.create));
router.patch('/:id', isCEO,      validateParams(idParamSchema), validateBody(updateEmployeeSchema), asyncHandler(employeesController.update));
router.patch('/:id/status', isCEO, validateParams(idParamSchema), asyncHandler(employeesController.updateStatus));
router.post( '/:id/reset-password', isCEO, validateParams(idParamSchema), asyncHandler(employeesController.resetPassword));
router.delete('/:id', isCEO,    validateParams(idParamSchema),       asyncHandler(employeesController.remove));

export default router;
