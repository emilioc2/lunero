import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../http';
import { entryApi } from '../entry-api';

const entry = {
  id: 'e1',
  flowSheetId: 'fs1',
  userId: 'u1',
  entryType: 'expense',
  categoryId: 'cat1',
  amount: 200,
  currency: 'USD',
  entryDate: '01/01/2024',
  isDeleted: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

let mock: MockAdapter;

beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.reset(); });

describe('entryApi', () => {
  it('list — GET /api/v1/flowsheets/:id/entries', async () => {
    mock.onGet('/api/v1/flowsheets/fs1/entries').reply(200, [entry]);
    const result = await entryApi.list('fs1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });

  it('create — POST /api/v1/entries', async () => {
    mock.onPost('/api/v1/entries').reply(201, entry);
    const result = await entryApi.create({
      flowSheetId: 'fs1',
      entryType: 'expense',
      categoryId: 'cat1',
      amount: 200,
      currency: 'USD',
      entryDate: '01/01/2024',
      clientUpdatedAt: '2024-01-01T00:00:00Z',
    });
    expect(result.id).toBe('e1');
  });

  it('update — PATCH /api/v1/entries/:id', async () => {
    const updated = { ...entry, amount: 250 };
    mock.onPatch('/api/v1/entries/e1').reply(200, updated);
    const result = await entryApi.update('e1', {
      amount: 250,
      clientUpdatedAt: '2024-01-02T00:00:00Z',
    });
    expect(result.amount).toBe(250);
  });

  it('delete — DELETE /api/v1/entries/:id returns void', async () => {
    mock.onDelete('/api/v1/entries/e1').reply(204);
    await expect(entryApi.delete('e1')).resolves.toBeUndefined();
  });

  it('rejects with 400 when amount is invalid', async () => {
    mock.onPost('/api/v1/entries').reply(400, { title: 'Validation failed', detail: 'amount must be > 0' });
    await expect(
      entryApi.create({
        flowSheetId: 'fs1',
        entryType: 'expense',
        categoryId: 'cat1',
        amount: 0,
        currency: 'USD',
        entryDate: '01/01/2024',
        clientUpdatedAt: '2024-01-01T00:00:00Z',
      })
    ).rejects.toMatchObject({ status: 400, title: 'Validation failed' });
  });

  it('rejects with 422 when sheet is locked', async () => {
    mock.onPatch('/api/v1/entries/e1').reply(422, { title: 'Unprocessable Entity', detail: 'FlowSheet is locked' });
    await expect(
      entryApi.update('e1', { amount: 100, clientUpdatedAt: '2024-01-01T00:00:00Z' })
    ).rejects.toMatchObject({ status: 422 });
  });
});
