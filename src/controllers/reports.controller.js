import * as service from '../services/reports.service.js';
import { sendSuccess } from '../utils/response.js';

export async function salesSummary(req, res) {
  sendSuccess(res, await service.salesSummary(req.db, req.query));
}
export async function revenueVsTarget(req, res) {
  sendSuccess(res, await service.revenueVsTarget(req.db));
}
export async function riskScores(req, res) {
  sendSuccess(res, await service.riskScores(req.db, req.query));
}
export async function outstandingBalance(req, res) {
  sendSuccess(res, await service.outstandingBalance(req.db));
}
export async function topCustomers(req, res) {
  sendSuccess(res, await service.topCustomers(req.db, req.query));
}
export async function collectionEfficiency(req, res) {
  sendSuccess(res, await service.collectionEfficiency(req.db));
}
export async function cremPerformance(req, res) {
  sendSuccess(res, await service.cremPerformance(req.db));
}
export async function inventorySummary(req, res) {
  sendSuccess(res, await service.inventorySummary(req.db));
}
export async function refreshMVs(req, res) {
  sendSuccess(res, await service.refreshMVs(req.db));
}

export async function getCEODashboard(req, res) {
  sendSuccess(res, await service.getCEODashboard(req.db));
}

export async function getCEOFinancials(req, res) {
  sendSuccess(res, await service.getCEOFinancials(req.db));
}

export async function getCEOWarehouse(req, res) {
  sendSuccess(res, await service.getCEOWarehouse(req.db));
}

export async function getCEOReport(req, res) {
  sendSuccess(res, await service.getCEOReport(req.db, req.params.reportType));
}

export async function exportCEOReport(req, res) {
  const { data } = await service.getCEOReport(req.db, req.params.reportType);
  if (!data || data.length === 0) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.reportType}.csv"`);
    return res.send('');
  }
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + (val ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvContent = csvRows.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.reportType}.csv"`);
  return res.send(csvContent);
}

export async function getAlerts(req, res) {
  sendSuccess(res, await service.getAlerts(req.db));
}

export async function getAuditLogs(req, res) {
  sendSuccess(res, await service.getAuditLogs(req.db, req.query));
}

export async function getWSDashboard(req, res) {
  sendSuccess(res, await service.getWSDashboard(req.db, req.user.id));
}

export async function getWEDashboard(req, res) {
  sendSuccess(res, await service.getWEDashboard(req.db));
}

export async function getWESummary(req, res) {
  sendSuccess(res, await service.getWESummary(req.db));
}

export async function getCREMDashboard(req, res) {
  sendSuccess(res, await service.getCREMDashboard(req.db, req.user.id));
}

export async function getCREMSummary(req, res) {
  sendSuccess(res, await service.getCREMSummary(req.db, req.user.id));
}

export async function getCREDashboard(req, res) {
  sendSuccess(res, await service.getCREDashboard(req.db));
}

export async function getCRESummary(req, res) {
  sendSuccess(res, await service.getCRESummary(req.db));
}

export async function getAEDashboard(req, res) {
  sendSuccess(res, await service.getAEDashboard(req.db));
}

export async function getAEOutstanding(req, res) {
  sendSuccess(res, await service.getAEOutstanding(req.db));
}

export async function getAESummary(req, res) {
  sendSuccess(res, await service.getAESummary(req.db));
}
