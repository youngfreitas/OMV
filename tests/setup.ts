import { vi } from 'vitest';

// next/headers só existe dentro de uma requisição: simulamos cookies e headers em memória.
const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n)! } : undefined),
    set: (n: string, v: string) => void jar.set(n, v),
    delete: (n: string) => void jar.delete(n),
  }),
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7', 'user-agent': 'vitest' }),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/navigation', () => ({
  redirect: (u: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${u}`), { digest: `NEXT_REDIRECT;${u}` });
  },
}));
(globalThis as unknown as { __jar: Map<string, string> }).__jar = jar;
