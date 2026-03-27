import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../http';
import { flowSheetApi } from '../flow-sheet-api';

const sheet = {
  id: 'fs1',
  userId: 'u1',
  periodType: 'monthly',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  status: 'active',
  editLocked: false,
  availableBalance: 500,
  totalIncome: 1000,
  totalExpenses: 400,
  totalSavings: 100,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

let mock: MockAdapter;

beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.reset(); });

describe('flowSheetApi', () => {
  it('getActive — GET /api/v1/flowsheets/active', async () => {
    mock.onGet('/api/v1/flowsheets/active').reply(200, sheet);
    const result = await flowSheetApi.getActive();
    expect(result).toEqual(sheet);
  });

  it('getAll — GET /api/v1/flowsheets', async () => {
    mock.onGet('/api/v1/flowsheets').reply(200, [sheet]);
    const result = await flowSheetApi.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('fs1');
  });

  it('getById — GET /api/v1/flowsheets/:id', async () => {
    mock.onGet('/api/v1/flowsheets/fs1').reply(200, sheet);
    const result = await flowSheetApi.getById('fs1');
    expect(result.id).toBe('fs1');
  });

  it('create — POST /api/v1/flowsheets', async () => {
    mock.onPost('/api/v1/flowsheets').reply(201, sheet);
    const result = await flowSheetApi.create({
      periodType: 'monthly',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });
    expect(result.periodType).toBe('monthly');
  });

  it('update — PATCH /api/v1/flowsheets/:id', async () => {
    const updated = { ...sheet, endDate: '2024-02-28' };
    mock.onPatch('/api/v1/flowsheets/fs1').reply(200, updated);
    const result = await flowSheetApi.update('fs1', { endDate: '2024-02-28' });
    expect(result.endDate).toBe('2024-02-28');
  });

  it('unlock — POST /api/v1/flowsheets/:id/unlock', async () => {
    const unlocked = { ...sheet, editLocked: false };
    mock.onPost('/api/v1/flowsheets/fs1/unlock').reply(200, unlocked);
    const result = await flowSheetApi.unlock('fs1');
    expect(result.editLocked).toBe(false);
  });

  it('rejects on 404', async () => {
    mock.onGet('/api/v1/flowsheets/missing').reply(404, { title: 'Not Found' });
    await expect(flowSheetApi.getById('missing')).rejects.toMatchObject({ status: 404 });
  });
});
