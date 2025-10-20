import { vi } from 'vitest';

const adminMock = { initializeApp: vi.fn() };

const firestoreMock = {
  collection: vi.fn(),
  doc: vi.fn(),
  runTransaction: vi.fn(),
  FieldValue: {
    serverTimestamp: vi.fn().mockReturnValue('serverTimestamp'),
    arrayUnion: vi.fn((item: unknown) => `arrayUnion(${item})`),
    arrayRemove: vi.fn((item: unknown) => `arrayRemove(${item})`),
    increment: vi.fn((value: unknown) => `increment(${value})`),
    delete: vi.fn().mockReturnValue('delete()'),
  },
  Timestamp: {
    now: vi.fn().mockReturnValue('now'),
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
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
