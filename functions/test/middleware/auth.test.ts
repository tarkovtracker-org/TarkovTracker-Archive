import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyBearer } from '../../src/middleware/auth.js';
import { TokenService } from '../../src/services/TokenService.js';

const createResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
  return res;
};

describe('verifyBearer middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('passes through OPTIONS requests', async () => {
    const next = vi.fn();
    await verifyBearer({ method: 'OPTIONS' } as any, createResponse(), next);
    expect(next).toHaveBeenCalled();
  });

  it('attaches token data when validation succeeds', async () => {
    vi.spyOn(TokenService.prototype, 'validateToken').mockResolvedValue({
      owner: 'user-1',
      permissions: ['GP'],
    } as any);

    const req: any = { method: 'GET', headers: { authorization: 'Bearer token' } };
    const res = createResponse();
    const next = vi.fn();

    await verifyBearer(req, res, next);

    expect(TokenService.prototype.validateToken).toHaveBeenCalledWith('Bearer token');
    expect(req.apiToken).toEqual({ owner: 'user-1', permissions: ['GP'] });
    expect(req.user).toEqual({ id: 'user-1' });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds with 401 on validation errors', async () => {
    vi.spyOn(TokenService.prototype, 'validateToken').mockRejectedValue(new Error('bad token'));

    const req: any = { method: 'GET', headers: { authorization: 'Bearer invalid' } };
    const res = createResponse();
    const next = vi.fn();

    await verifyBearer(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'bad token' });
    expect(next).not.toHaveBeenCalled();
  });
});
