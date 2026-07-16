import '@testing-library/jest-dom';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.AUTH_SECRET = 'test-secret';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock crypto.subtle for tests
if (typeof globalThis.crypto?.subtle === 'undefined') {
  const subtle = {
    digest: async (algorithm: string, data: ArrayBuffer) => {
      return new Uint8Array(0);
    },
  };
  (globalThis as any).crypto = { subtle };
}
