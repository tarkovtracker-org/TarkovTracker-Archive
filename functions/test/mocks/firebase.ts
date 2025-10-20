import { vi } from 'vitest';

const adminMock = { initializeApp: vi.fn() };

const createSentinel = (type: string, payload: Record<string, unknown> = {}) => ({
  __fieldValue: type,
  ...payload,
});

const firestoreMock = {
  collection: vi.fn(),
  doc: vi.fn(),
  runTransaction: vi.fn(),
  FieldValue: {
    serverTimestamp: vi.fn(() => createSentinel('serverTimestamp')),
    arrayUnion: vi.fn((...items: unknown[]) => createSentinel('arrayUnion', { values: items })),
    arrayRemove: vi.fn((...items: unknown[]) => createSentinel('arrayRemove', { values: items })),
    increment: vi.fn((value: unknown) => createSentinel('increment', { value })),
    delete: vi.fn(() => createSentinel('delete')),
  },
  Timestamp: {
    now: vi.fn(() => {
      const now = new Date();
      return {
        toDate: () => now,
        toMillis: () => now.getTime(),
      };
    }),
    fromDate: vi.fn((date: Date) => ({
      toDate: () => date,
      toMillis: () => date.getTime(),
    })),
    fromMillis: vi.fn((millis: number) => {
      const date = new Date(millis);
      return {
        toDate: () => date,
        toMillis: () => millis,
      };
    }),
  },
};

const loggerMock = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

const functionsMock = {
  config: vi.fn().mockReturnValue({}),
  https: {
    onRequest: vi.fn((handler: any) => handler),
    onCall: vi.fn((handler: any) => handler),
    HttpsError: class HttpsError extends Error {
      code: string;

      constructor(code: string, message: string) {
        super(message);
        this.code = code;
      }
    },
  },
  logger: loggerMock,
  pubsub: {
    schedule: vi.fn(() => ({
      timeZone: vi.fn().mockReturnThis(),
      onRun: vi.fn((handler: any) => handler),
    })),
  },
};

export { adminMock, firestoreMock, functionsMock, loggerMock };
