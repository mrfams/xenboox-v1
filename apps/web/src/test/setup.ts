import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABUSE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABUSE_KEY = 'test-key';

// Mock crypto.subtle for tests
if (typeof globalThis.crypto?.subtle === 'undefined') {
  const subtle = {
    digest: async (algorithm: string, data: ArrayBuffer) => {
      return new Uint8Array(0);
    },
  };
  (globalThis as any).crypto = { subtle };
}