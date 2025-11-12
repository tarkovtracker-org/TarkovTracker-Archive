/**
 * Unit tests for httpMocks utilities
 * Verifies that all mock methods work correctly and maintain state
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockResponse,
  createMockRequest,
  createAuthenticatedRequest,
  createMockResponseReturnThis,
  createMockReqRes,
  type MockResponse,
  type MockRequest,
} from './httpMocks';
describe('httpMocks', () => {
  describe('createMockResponse', () => {
    let res: MockResponse;
    beforeEach(() => {
      res = createMockResponse();
    });
    it('should initialize with default values', () => {
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe(null);
      expect(res.headers).toEqual({});
    });
    it('should chain status method correctly', () => {
      const result = res.status(404);
      expect(res.statusCode).toBe(404);
      expect(result).toBe(res); // Should return itself for chaining
    });
    it('should chain json method correctly', () => {
      const testData = { message: 'test' };
      const result = res.json(testData);
      expect(res.body).toBe(testData);
      expect(result).toBe(res);
    });

    it('should chain send method correctly', () => {
      const testData = 'raw response';
      const result = res.send(testData);
      expect(res.body).toBe(testData);
      expect(result).toBe(res);
    });

    it('should handle set method with key/value', () => {
      const result = res.set('Content-Type', 'application/json');
      expect(res.headers['Content-Type']).toBe('application/json');
      expect(result).toBe(res);
    });

    it('should handle set method with object', () => {
      const headers = { 'Content-Type': 'application/json', 'X-Custom': 'value' };
      const result = res.set(headers);
      expect(res.headers).toEqual(headers);
      expect(result).toBe(res);
    });

    it('should handle header method', () => {
      const result = res.header('X-Custom', 'value');
      expect(res.headers['X-Custom']).toBe('value');
      expect(result).toBe(res);
    });

    it('should handle setHeader method', () => {
      const result = res.setHeader('X-Custom', 'value');
      expect(res.headers['X-Custom']).toBe('value');
      expect(result).toBe(res);
    });

    it('should retrieve headers with getHeader', () => {
      res.set('Content-Type', 'application/json');
      expect(res.getHeader('Content-Type')).toBe('application/json');
    });

    it('should support method chaining', () => {
      const testData = { success: true };
      const result = res
        .status(201)
        .set('Content-Type', 'application/json')
        .set('X-Custom', 'test')
        .json(testData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toBe(testData);
      expect(res.headers).toEqual({
        'Content-Type': 'application/json',
        'X-Custom': 'test',
      });
      expect(result).toBe(res);
    });

    it('should have end method', () => {
      res.end();
      expect(res.end).toHaveBeenCalled();
    });

    it('should track all mock calls', () => {
      res.status(200).json({ test: 'data' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ test: 'data' });
    });
  });

  describe('createMockRequest', () => {
    it('should create request with defaults', () => {
      const req = createMockRequest();
      expect(req.method).toBe('GET');
      expect(req.headers).toEqual({});
      expect(req.body).toEqual({});
      expect(req.params).toEqual({});
      expect(req.query).toEqual({});
      expect(req.get).toBeDefined();
    });

    it('should accept overrides', () => {
      const overrides = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { data: 'test' },
        params: { id: '123' },
        query: { search: 'test' },
      };
      const req = createMockRequest(overrides);
      expect(req.method).toBe('POST');
      expect(req.headers).toEqual({ 'content-type': 'application/json' });
      expect(req.body).toEqual({ data: 'test' });
      expect(req.params).toEqual({ id: '123' });
      expect(req.query).toEqual({ search: 'test' });
    });

    it('should implement get method for headers', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer token123' },
      });
      expect(req.get('authorization')).toBe('Bearer token123');
      expect(req.get('Authorization')).toBe('Bearer token123'); // Case insensitive
      expect(req.get('missing')).toBeUndefined();
    });
  });

  describe('createAuthenticatedRequest', () => {
    it('should create authenticated request with defaults', () => {
      const req = createAuthenticatedRequest('user-123');
      expect(req.headers.authorization).toBe('Bearer test-token-user-123');
      expect(req.user).toEqual({ id: 'user-123', uid: 'user-123' });
      expect(req.apiToken).toEqual({
        owner: 'user-123',
        permissions: ['GP'],
        token: 'test-token-user-123',
      });
      expect(req.auth).toEqual({ uid: 'user-123' });
    });

    it('should accept custom permissions', () => {
      const req = createAuthenticatedRequest('user-123', ['GP', 'TP', 'WP']);
      expect(req.apiToken.permissions).toEqual(['GP', 'TP', 'WP']);
    });

    it('should accept additional overrides', () => {
      const req = createAuthenticatedRequest('user-123', ['GP'], {
        method: 'POST',
        body: { data: 'test' },
      });
      expect(req.method).toBe('POST');
      expect(req.body).toEqual({ data: 'test' });
      expect(req.headers.authorization).toBe('Bearer test-token-user-123');
    });
  });

  describe('createMockResponseReturnThis', () => {
    it('should create response with mockReturnThis behavior', () => {
      const res = createMockResponseReturnThis();

      // All methods should return the same object
      expect(res.status(404)).toBe(res);
      expect(res.json({ data: 'test' })).toBe(res);
      expect(res.send('raw')).toBe(res);
      expect(res.set('header', 'value')).toBe(res);
      expect(res.header('header', 'value')).toBe(res);
      expect(res.setHeader('header', 'value')).toBe(res);
    });

    it('should still track mock calls', () => {
      const res = createMockResponseReturnThis();
      res.status(200).json({ success: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('createMockReqRes', () => {
    it('should create both request and response without auth', () => {
      const { req, res } = createMockReqRes();
      expect(req.method).toBe('GET');
      expect(req.user).toBeUndefined();
      expect(res.statusCode).toBe(200);
    });

    it('should create authenticated request and response', () => {
      const { req, res } = createMockReqRes('user-123');
      expect(req.user).toEqual({ id: 'user-123', uid: 'user-123' });
      expect(req.headers.authorization).toBe('Bearer test-token-user-123');
      expect(res.statusCode).toBe(200);
    });

    it('should accept request and response overrides', () => {
      const { req, res } = createMockReqRes(
        'user-123',
        { method: 'POST', body: { data: 'test' } },
        { statusCode: 201 }
      );
      expect(req.method).toBe('POST');
      expect(req.body).toEqual({ data: 'test' });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('TypeScript Types', () => {
    it('should enforce correct types for MockResponse', () => {
      const res: MockResponse = createMockResponse();
      // These should compile without errors
      res.status(200);
      res.json({ data: 'test' });
      res.send('response');
      res.set('header', 'value');
      res.header('header', 'value');
      res.setHeader('header', 'value');
      res.getHeader('header');
      res.end();
    });

    it('should enforce correct types for MockRequest', () => {
      const req: MockRequest = createMockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { data: 'test' },
        user: { id: 'user-123' },
        apiToken: { owner: 'user-123', permissions: ['GP'], token: 'token' },
        auth: { uid: 'user-123' },
      });
      // Access should be type-safe
      expect(req.method).toBe('POST');
      expect(req.body).toEqual({ data: 'test' });
    });
  });
});
