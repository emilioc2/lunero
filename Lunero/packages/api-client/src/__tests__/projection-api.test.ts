import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../http';
import { projectionApi } from '../projection-api';

const projection = {
  id: 'proj1',
  flowSheetId: 'fs1',
  userId: 'u1',
  categoryId: 'cat1',
  projectedAmount: 500,
  currency: 'USD',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const summary = {
  flowSheetId: 'fs1',
  byCategory: [
    {
      categoryId: 'cat1',
      categoryName: 'Groceries',
      entryType: 'expense',
      projectedAmount: 500,
      actualAmount: 320,
      statusColor: '#C86D5A',
    },
  ],
  byEntryType: {
    income: { projected: 3000, actual: 3000, statusColor: '#6B6F69' },
    expense: { projected: 500, actual: 320, statusColor: '#C86D5A' },
    savings: { projected: 200, actual: 200, statusColor: '#C4A484' },
  },
  overall: { projected: 3700, actual: 3520, statusColor: '#6B6F69' },
};

let mock: MockAdapter;

beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.reset(); });

describe('projectionApi', () => {
  it('getProjections — GET /api/v1/flowsheets/:id/projections', async () => {
    mock.onGet('/api/v1/flowsheets/fs1/projections').reply(200, [projection]);
    const result = await projectionApi.getProjections('fs1');
    expect(result).toHaveLength(1);
    const first = result[0]!;
    expect(first.id).toBe('proj1');
    expect(first.projectedAmount).toBe(500);
  });

  it('upsertProjection — PUT /api/v1/flowsheets/:id/projections/:categoryId', async () => {
    mock.onPut('/api/v1/flowsheets/fs1/projections/cat1').reply(200, projection);
    const result = await projectionApi.upsertProjection('fs1', 'cat1', {
      projectedAmount: 500,
      currency: 'USD',
    });
    expect(result?.id).toBe('proj1');
    expect(result?.categoryId).toBe('cat1');
  });

  it('deleteProjection — DELETE /api/v1/flowsheets/:id/projections/:categoryId returns void', async () => {
    mock.onDelete('/api/v1/flowsheets/fs1/projections/cat1').reply(204);
    await expect(projectionApi.deleteProjection('fs1', 'cat1')).resolves.toBeUndefined();
  });

  it('getProjectionSummary — GET /api/v1/flowsheets/:id/projections/summary', async () => {
    mock.onGet('/api/v1/flowsheets/fs1/projections/summary').reply(200, summary);
    const result = await projectionApi.getProjectionSummary('fs1');
    expect(result.flowSheetId).toBe('fs1');
    expect(result.byCategory).toHaveLength(1);
    expect(result.overall.projected).toBe(3700);
  });

  it('rejects with 400 when projectedAmount is invalid', async () => {
    mock.onPut('/api/v1/flowsheets/fs1/projections/cat1').reply(400, {
      title: 'Validation failed',
      detail: 'projectedAmount must be > 0',
    });
    await expect(
      projectionApi.upsertProjection('fs1', 'cat1', { projectedAmount: 0, currency: 'USD' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects with 404 when flowsheet not found', async () => {
    mock.onGet('/api/v1/flowsheets/missing/projections').reply(404, {
      title: 'Not Found',
      detail: 'FlowSheet not found',
    });
    await expect(projectionApi.getProjections('missing')).rejects.toMatchObject({ status: 404 });
  });
});
