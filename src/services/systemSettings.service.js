import * as repo from '../repositories/systemSettings.repository.js';
import { Err } from '../utils/errors.js';

export async function listAll(db) {
  return repo.findAll(db);
}

export async function getByKey(db, key) {
  const s = await repo.findByKey(db, key);
  if (!s) throw Err.notFound(`Setting '${key}'`);
  return s;
}

export async function upsert(db, key, value, updatedBy) {
  return repo.upsert(db, key, value, updatedBy);
}

export async function bulkUpdate(db, settings, updatedBy) {
  const results = [];
  for (const { key, value } of settings) {
    results.push(await repo.upsert(db, key, value, updatedBy));
  }
  return results;
}
