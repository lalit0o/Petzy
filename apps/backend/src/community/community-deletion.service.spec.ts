import { Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CommunityDeletionService } from './community-deletion.service';

describe('CommunityDeletionService photos after commit', () => {
  const remove = jest.fn();
  const from = jest.fn().mockReturnValue({ remove });
  const service = new CommunityDeletionService({ getClient: () => ({ storage: { from } }) } as unknown as SupabaseService);
  beforeEach(() => { jest.clearAllMocks(); remove.mockResolvedValue({ error: null }); });
  it('deduplicates paths, uses each private bucket and limits batches', async () => {
    await service.cleanPhotos([{ community: 'cover.jpg', posts: [...Array.from({ length: 101 }, (_, i) => `p${i}.jpg`), 'p0.jpg'] }]);
    expect(from.mock.calls.map(call => call[0])).toEqual(['post-photos', 'post-photos', 'community-photos']);
    expect(remove.mock.calls.map(call => call[0].length)).toEqual([100, 1, 1]);
  });
  it('retries an external failure without failing a committed deactivation', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    remove.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({ error: { message: 'still unavailable' } }).mockResolvedValueOnce({ error: null });
    await expect(service.cleanPhotos([{ community: null, posts: ['one.jpg'] }])).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(3); expect(log).not.toHaveBeenCalled();
    remove.mockResolvedValue({ error: { message: 'offline' } });
    await expect(service.cleanPhotos([{ community: null, posts: ['pending.jpg'] }])).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('pending.jpg'));
    log.mockRestore();
  });
});
