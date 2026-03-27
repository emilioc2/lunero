import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../http';
import { categoryApi } from '../category-api';

const category = {
  id: 'cat1',
  userId: 'u1',
  name: 'Groceries',
  entryType: 'expense',
  isDefault: false,
  sortOrder: 0,
  createdAt: '2024-01-01T00:00:00Z',
};

let mock: MockAdapter;

beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.reset(); });

describe('categoryApi', () => {
  it('list — GET /api/v1/categories', async () => {
    mock.onGet('/api/v1/categories').reply(200, [category]);
    const result = await categoryApi.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Groceries');
  });

  it('create — POST /api/v1/categories', async () => {
    mock.onPost('/api/v1/categories').reply(201, category);
    const result = await categoryApi.create({ name: 'Groceries', entryType: 'expense' });
    expect(result.entryType).toBe('expense');
  });

  it('update — PATCH /api/v1/categories/:id', async () => {
    const updated = { ...category, name: 'Food' };
    mock.onPatch('/api/v1/categories/cat1').reply(200, updated);
    const result = await categoryApi.update('cat1', { name: 'Food' });
    expect(result.name).toBe('Food');
  });

  it('delete — DELETE /api/v1/categories/:id returns void', async () => {
    mock.onDelete('/api/v1/categories/cat1').reply(204);
    await expect(categoryApi.delete('cat1')).resolves.toBeUndefined();
  });

  it('rejects with 409 when category has entries', async () => {
    mock.onDelete('/api/v1/categories/cat1').reply(409, {
      title: 'Conflict',
      detail: 'Category has assigned entries',
    });
    await expect(categoryApi.delete('cat1')).rejects.toMatchObject({ status: 409 });
  });

  it('reassign — PATCH /api/v1/categories/:id/reassign returns void', async () => {
    mock.onPatch('/api/v1/categories/cat1/reassign').reply(204);
    await expect(
      categoryApi.reassign('cat1', { targetCategoryId: 'cat2' })
    ).resolves.toBeUndefined();
  });

  it('rejects with 400 when changing entryType', async () => {
    mock.onPatch('/api/v1/categories/cat1').reply(400, {
      title: 'Validation failed',
      detail: 'entryType is immutable',
    });
    await expect(categoryApi.update('cat1', { name: 'X' })).rejects.toMatchObject({ status: 400 });
  });
});
