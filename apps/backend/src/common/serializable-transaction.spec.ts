import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { serializableTransaction } from './serializable-transaction';

describe('serializableTransaction', () => {
  const work = jest.fn().mockResolvedValue('ok');
  it.each([
    { code: 'P2034' },
    { name: 'DriverAdapterError', cause: { originalCode: '40001', kind: 'TransactionWriteConflict' } },
    { meta: { driverAdapterError: { cause: { originalCode: '40P01' } } } },
  ])('retries a serialization/deadlock conflict, including COMMIT adapter errors', async error => {
    const transaction = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('ok');
    expect(await serializableTransaction({ $transaction: transaction } as unknown as PrismaService, work)).toBe('ok');
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(transaction).toHaveBeenLastCalledWith(work, expect.objectContaining({ isolationLevel: 'Serializable' }));
  });
  it('preserves nontransaction errors without retrying', async () => {
    const error = { code: 'P2002' }; const transaction = jest.fn().mockRejectedValue(error);
    await expect(serializableTransaction({ $transaction: transaction } as unknown as PrismaService, work)).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
  it('stops after four attempts with a retryable HTTP conflict', async () => {
    const transaction = jest.fn().mockRejectedValue({ code: 'P2034' });
    await expect(serializableTransaction({ $transaction: transaction } as unknown as PrismaService, work)).rejects.toBeInstanceOf(ConflictException);
    expect(transaction).toHaveBeenCalledTimes(4);
  });
});
