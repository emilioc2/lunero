import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../http';
import { recurringApi } from '../recurring-api';

const recurring = {
  id: 'r1',
  userId: 'u1',
  entryType: 'expense',
  categoryId: 'cat1',
  amount: 800,
  currency: 'USD',
  cadence: 'monthly',
  isPaused: false,
  isDeleted: false,
};

let mock: MockAdapter;

beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.reset(); });

describe('recurringApi', () => {
  it('list — GET /api/v1/recurring', async () => {
    mock.onGet('/api/v1/recurring').reply(200, [recurring]);
    const result = await recurringApi.list();
    expect(result).toHaveLength(1);
    expect(result[0].cadence).toBe('monthly');
  });

  it('create — POST /api/v1/recurring', async () => {
    mock.onPost('/api/v1/recurring').reply(201, recurring);
    const result = await recurringApi.create({
      entryType: 'expense',
      categoryId: 'cat1',
      amount: 800,
      currency: 'USD',
      cadence: 'monthly',
    });
    expect(result.id).toBe('r1');
  });

  it('update — PATCH /api/v1/recurring/:id', async () => {
    const updated = { ...recurring, amount: 900 };
    mock.onPatch('/api/v1/recurring/r1').reply(200, updated);
    const result = await recurringApi.update('r1', { amount: 900 });
    expect(result.amount).toBe(900);
  });

  it('delete — DELETE /api/v1/recurring/:id returns void', async () => {
    mock.onDelete('/api/v1/recurring/r1').reply(204);
    await expect(recurringApi.delete('r1')).resolves.toBeUndefined();
  });

  it('pause — POST /api/v1/recurring/:id/pause', async () => {
    const paused = { ...recurring, isPaused: true };
    mock.onPost('/api/v1/recurring/r1/pause').reply(200, paused);
    const result = await recurringApi.pause('r1');
    expect(result.isPaused).toBe(true);
  });

  it('resume — POST /api/v1/recurring/:id/resume', async () => {
    mock.onPost('/api/v1/recurring/r1/resume').reply(200, recurring);
    const result = await recurringApi.resume('r1');
    expect(result.isPaused).toBe(false);
  });
});
