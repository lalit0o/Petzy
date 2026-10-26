import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

describe('SupabaseService', () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SECRET_KEY;

  afterEach(() => {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousKey;
    jest.clearAllMocks();
  });

  it('creates a separate Auth client for each operation without persisting sessions', () => {
    process.env.SUPABASE_URL = 'https://petzy.example';
    process.env.SUPABASE_SECRET_KEY = 'test-secret';
    const firstClient = { id: 'first' } as unknown as ReturnType<typeof createClient>;
    const secondClient = { id: 'second' } as unknown as ReturnType<typeof createClient>;
    const createClientMock = jest.mocked(createClient);
    createClientMock
      .mockReturnValueOnce(firstClient)
      .mockReturnValueOnce(secondClient);

    const service = new SupabaseService();
    expect(service.getClient()).toBe(firstClient);
    expect(service.getClient()).toBe(secondClient);
    expect(createClientMock).toHaveBeenCalledTimes(2);
    expect(createClientMock).toHaveBeenCalledWith(
      'https://petzy.example',
      'test-secret',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  });
});
