import * as repo from '../repositories/dashboards.repository.js';

export const getCEODashboard        = (db)        => repo.getCEODashboard(db);
export const getCEOFinancials        = (db)        => repo.getCEOFinancials(db);
export const getCEOWarehouse         = (db)        => repo.getCEOWarehouse(db);
export const getCEORevenue           = (db)        => repo.getCEORevenue(db);
export const getCEOCollections       = (db)        => repo.getCEOCollections(db);
export const getCEOCustomerRisk      = (db)        => repo.getCEOCustomerRisk(db);
export const getCEOEmployeeProductivity = (db)     => repo.getCEOEmployeeProductivity(db);

export const getAEDashboard          = (db)        => repo.getAEDashboard(db);
export const getAEOutstanding        = (db)        => repo.getAEOutstanding(db);
export const getAESummary            = (db)        => repo.getAESummary(db);

export const getCREDashboard         = (db)        => repo.getCREDashboard(db);
export const getCRESummary           = (db)        => repo.getCRESummary(db);

export const getCREMDashboard        = (db)        => repo.getCREMDashboard(db);
export const getCREMSummary          = (db)        => repo.getCREMSummary(db);

export const getWEDashboard          = (db)        => repo.getWEDashboard(db);
export const getWESummary            = (db)        => repo.getWESummary(db);

export const getWSDashboard          = (db)        => repo.getWSDashboard(db);

export const getAlerts               = (db, query) => repo.getAlerts(db, parseInt(query?.limit) || 10);
export const getAuditLogs            = (db, query) => repo.getAuditLogs(db, query);
