import * as svc from '../services/dashboards.service.js';
import { sendSuccess } from '../utils/response.js';

const h = (fn) => async (req, res) => sendSuccess(res, await fn(req.db, req.query));

export const ceoDashboard            = h(svc.getCEODashboard);
export const ceoFinancials           = h(svc.getCEOFinancials);
export const ceoWarehouse            = h(svc.getCEOWarehouse);
export const ceoRevenue              = h(svc.getCEORevenue);
export const ceoCollections          = h(svc.getCEOCollections);
export const ceoCustomerRisk         = h(svc.getCEOCustomerRisk);
export const ceoEmployeeProductivity = h(svc.getCEOEmployeeProductivity);

export const aeDashboard             = h(svc.getAEDashboard);
export const aeOutstanding           = h(svc.getAEOutstanding);
export const aeSummary               = h(svc.getAESummary);

export const creDashboard            = h(svc.getCREDashboard);
export const creSummary              = h(svc.getCRESummary);

export const cremDashboard           = h(svc.getCREMDashboard);
export const cremSummary             = h(svc.getCREMSummary);

export const weDashboard             = h(svc.getWEDashboard);
export const weSummary               = h(svc.getWESummary);

export const wsDashboard             = h(svc.getWSDashboard);

export const alerts                  = h(svc.getAlerts);
export const auditLogs               = h(svc.getAuditLogs);
