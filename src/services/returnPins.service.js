import * as repo from '../repositories/returnPins.repository.js';
import * as returnsRepo from '../repositories/returns.repository.js';
import { Err } from '../utils/errors.js';

export async function generatePin(db, returnId, generatedBy) {
  const ret = await returnsRepo.findById(db, returnId);
  if (!ret) throw Err.notFound('Return');
  if (!['PICKUP_SCHEDULED', 'OUT_FOR_PICKUP'].includes(ret.status)) {
    throw Err.unprocessable('Return PIN can only be generated for returns scheduled or out for pickup');
  }
  return repo.generate(db, returnId, generatedBy);
}

export async function getPin(db, returnId) {
  const pin = await repo.findActiveByReturn(db, returnId);
  if (!pin) throw Err.notFound('Active return PIN');
  return pin;
}

export async function verifyPin(db, returnId, body, wsId) {
  const result = await repo.verify(db, returnId, body.pin, wsId, body.latitude, body.longitude);
  if (!result || result.verified === false) throw Err.badRequest('Invalid or expired PIN');
  return result;
}
