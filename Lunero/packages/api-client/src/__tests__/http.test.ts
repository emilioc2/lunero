import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { createApiClient, setTokenProvider } from '../http';

describe('createApiClient', () => {
  let mock: MockAdapter;
  const client = createApiClient('http://localhost:8080');

  beforeEach(() => {
    mock = new MockAdapter(client);
  });

  afterEach(() => {
    mock.reset();
    setTokenProvider(null as any);
  });

  describe('token injection', () => {
    it('attaches Authorization header when token provider returns a token', async () => {
      setTokenProvider(async () => 'test-jwt-token');
      mock.onGet('/api/v1/profile').reply(200, { id: 'u1' });

      await client.get('/api/v1/profile');

      const request = mock.history.get[0];
      expect(request.headers?.Authorization).toBe('Bearer test-jwt-token');
    });

    it('does not attach Authorization header when token provider returns null', async () => {
      setTokenProvider(async () => null);
      mock.onGet('/api/v1/profile').reply(200, {});

      await client.get('/api/v1/profile');

      const request = mock.history.get[0];
      expect(request.headers?.Authorization).toBeUndefined();
    });

    it('does not attach Authorization header when no token provider is set', async () => {
      mock.onGet('/api/v1/profile').reply(200, {});

      await client.get('/api/v1/profile');

      const request = mock.history.get[0];
      expect(request.headers?.Authorization).toBeUndefined();
    });
  });

  describe('error interceptor', () => {
    it('normalizes 400 response into ApiError shape', async () => {
      mock.onPost('/api/v1/entries').reply(400, {
        title: 'Validation failed',
        detail: 'amount must be > 0',
      });

      await expect(client.post('/api/v1/entries', {})).rejects.toMatchObject({
        status: 400,
        title: 'Validation failed',
        detail: 'amount must be > 0',
      });
    });

    it('normalizes 401 response into ApiError shape', async () => {
      mock.onGet('/api/v1/flowsheets/active').reply(401, {
        title: 'Unauthorized',
      });

      await expect(client.get('/api/v1/flowsheets/active')).rejects.toMatchObject({
        status: 401,
        title: 'Unauthorized',
      });
    });

    it('normalizes 403 response into ApiError shape', async () => {
      mock.onGet('/api/v1/flowsheets/other-user').reply(403, {
        title: 'Forbidden',
        detail: 'Resource does not belong to authenticated user',
      });

      await expect(client.get('/api/v1/flowsheets/other-user')).rejects.toMatchObject({
        status: 403,
        title: 'Forbidden',
      });
    });

    it('normalizes 404 response into ApiError shape', async () => {
      mock.onGet('/api/v1/flowsheets/missing').reply(404, {
        title: 'Not Found',
      });

      await expect(client.get('/api/v1/flowsheets/missing')).rejects.toMatchObject({
        status: 404,
        title: 'Not Found',
      });
    });

    it('normalizes 409 conflict into ApiError shape', async () => {
      mock.onDelete('/api/v1/categories/cat1').reply(409, {
        title: 'Conflict',
        detail: 'Category has assigned entries',
      });

      await expect(client.delete('/api/v1/categories/cat1')).rejects.toMatchObject({
        status: 409,
        title: 'Conflict',
        detail: 'Category has assigned entries',
      });
    });

    it('normalizes 422 into ApiError shape', async () => {
      mock.onPatch('/api/v1/entries/e1').reply(422, {
        title: 'Unprocessable Entity',
        detail: 'FlowSheet is locked',
      });

      await expect(client.patch('/api/v1/entries/e1', {})).rejects.toMatchObject({
        status: 422,
        title: 'Unprocessable Entity',
      });
    });

    it('normalizes 503 into ApiError shape', async () => {
      mock.onPost('/api/v1/ai/query').reply(503, {
        title: 'Service Unavailable',
      });

      await expect(client.post('/api/v1/ai/query', {})).rejects.toMatchObject({
        status: 503,
        title: 'Service Unavailable',
      });
    });

    it('falls back to error message when response has no title', async () => {
      mock.onGet('/api/v1/profile').reply(500, {});

      await expect(client.get('/api/v1/profile')).rejects.toMatchObject({
        status: 500,
      });
    });

    it('exposes the raw AxiosError on the ApiError', async () => {
      mock.onGet('/api/v1/profile').reply(401, { title: 'Unauthorized' });

      const err = await client.get('/api/v1/profile').catch((e) => e);
      expect(err.raw).toBeDefined();
      expect(axios.isAxiosError(err.raw)).toBe(true);
    });

    it('sets status to 0 for network errors', async () => {
      mock.onGet('/api/v1/profile').networkError();

      const err = await client.get('/api/v1/profile').catch((e) => e);
      expect(err.status).toBe(0);
    });
  });
});
