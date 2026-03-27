import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../http';
import { aiCoachApi } from '../ai-coach-api';

const alert = {
  id: 'alert1',
  type: 'overspend',
  message: 'Your balance is projected to reach zero before the end of the period.',
  flowSheetId: 'fs1',
  createdAt: '2024-01-15T10:00:00Z',
};

let mock: MockAdapter;

beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.reset(); });

describe('aiCoachApi', () => {
  it('query — POST /api/v1/ai/query', async () => {
    mock.onPost('/api/v1/ai/query').reply(200, { response: 'You have $500 available.' });
    const result = await aiCoachApi.query({ message: 'How much do I have left?' });
    expect(result.response).toBe('You have $500 available.');
  });

  it('getAlerts — GET /api/v1/ai/alerts', async () => {
    mock.onGet('/api/v1/ai/alerts').reply(200, [alert]);
    const result = await aiCoachApi.getAlerts();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('overspend');
  });

  it('getAlerts — returns empty array when no alerts', async () => {
    mock.onGet('/api/v1/ai/alerts').reply(200, []);
    const result = await aiCoachApi.getAlerts();
    expect(result).toHaveLength(0);
  });

  it('dismissAlert — POST /api/v1/ai/alerts/:id/dismiss returns void', async () => {
    mock.onPost('/api/v1/ai/alerts/alert1/dismiss').reply(204);
    await expect(aiCoachApi.dismissAlert('alert1')).resolves.toBeUndefined();
  });

  it('query — rejects with 503 when Mira is unavailable', async () => {
    mock.onPost('/api/v1/ai/query').reply(503, { title: 'Service Unavailable' });
    await expect(aiCoachApi.query({ message: 'hello' })).rejects.toMatchObject({ status: 503 });
  });
});
