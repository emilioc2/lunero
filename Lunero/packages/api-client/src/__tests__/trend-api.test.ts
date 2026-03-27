import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../http';
import { trendApi } from '../trend-api';

const trendData = {
  view: 'monthly',
  periods: [
    {
      id: 'p1',
      label: 'Jan 2024',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      totalIncome: 3000,
      totalExpenses: 1200,
      totalSavings: 500,
      availableBalance: 1300,
    },
  ],
};

const breakdown = [
  {
    id: 'e1',
    flowSheetId: 'fs1',
    userId: 'u1',
    entryType: 'expense',
    categoryId: 'cat1',
    amount: 200,
    currency: 'USD',
    entryDate: '2024-01-05',
    isDeleted: false,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
  },
];

let mock: MockAdapter;

beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.reset(); });

describe('trendApi', () => {
  it('getTrends — GET /api/v1/trends with view param', async () => {
    mock.onGet('/api/v1/trends').reply(200, trendData);
    const result = await trendApi.getTrends({ view: 'monthly' });
    expect(result.view).toBe('monthly');
    expect(result.periods).toHaveLength(1);
  });

  it('getTrends — passes from/to/categoryId params', async () => {
    mock.onGet('/api/v1/trends').reply(200, trendData);
    await trendApi.getTrends({ view: 'weekly', from: '2024-01-01', to: '2024-03-31', categoryId: 'cat1' });
    const params = mock.history.get[0].params;
    expect(params.view).toBe('weekly');
    expect(params.from).toBe('2024-01-01');
    expect(params.categoryId).toBe('cat1');
  });

  it('getBreakdown — GET /api/v1/trends/:id/breakdown', async () => {
    mock.onGet('/api/v1/trends/p1/breakdown').reply(200, breakdown);
    const result = await trendApi.getBreakdown('p1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });
});
