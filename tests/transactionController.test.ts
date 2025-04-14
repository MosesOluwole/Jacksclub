import { DynamoDB } from 'aws-sdk';
import { transact } from '../src/transaction/transactionController';
import { TransactionInput } from '../src/interfaces/transactionInterfaces';


const mockTransactWriteFn = jest.fn();
const mockTransactWritePromise = jest.fn(() => Promise.resolve({}));

jest.mock('aws-sdk', () => {
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => ({
        transactWrite: (params: any) => {
          mockTransactWriteFn(params);
          return { promise: mockTransactWritePromise };
        },
      })),
    },
  };
});

describe('Transaction Controller - transact', () => {
  const userId = '1';

  beforeEach(() => {
    mockTransactWriteFn.mockClear();
    mockTransactWritePromise.mockClear();
  });

  test('should process a credit transaction successfully', async () => {
    const input: TransactionInput = {
      idempotentKey: 'txn-123',
      userId,
      amount: '50', 
      type: 'credit',
    };

    await expect(transact(input)).resolves.toBeUndefined();
    const params = mockTransactWriteFn.mock.calls[0][0];
    expect(params).toHaveProperty('TransactItems');

    const updateOp = params.TransactItems.find((item: any) => item.Update)?.Update;
    expect(updateOp).toBeDefined();
    expect(updateOp.UpdateExpression).toMatch(/SET balance = if_not_exists\(balance, :default\) \+ :delta/);
    expect(updateOp.ConditionExpression).toBeUndefined();
    const putOp = params.TransactItems.find((item: any) => item.Put)?.Put;
    expect(putOp.ConditionExpression).toBe('attribute_not_exists(idempotentKey)');
  });

  test('should process a debit transaction successfully with a condition preventing negative balance', async () => {
    const input: TransactionInput = {
      idempotentKey: 'txn-124',
      userId,
      amount: '30', 
      type: 'debit',
    };

    await expect(transact(input)).resolves.toBeUndefined();

    const params = mockTransactWriteFn.mock.calls[0][0];
    expect(params).toHaveProperty('TransactItems');

    const updateOp = params.TransactItems.find((item: any) => item.Update)?.Update;
    expect(updateOp).toBeDefined();
    expect(updateOp.ConditionExpression).toBeDefined();
    expect(updateOp.ConditionExpression).toContain('>= :min');
    expect(updateOp.ExpressionAttributeValues[":min"]).toBe(0);
  });

  test('should throw an error for a duplicate transaction (idempotency violation)', async () => {
    const input: TransactionInput = {
      idempotentKey: 'txn-125',
      userId,
      amount: '40',
      type: 'credit',
    };

    const error = new Error('Duplicate Transaction');
    // @ts-ignore: adding code for my test.
    error.code = 'TransactionCanceledException';
    mockTransactWritePromise.mockReturnValueOnce(Promise.reject(error));

    await expect(transact(input)).rejects.toThrow('Transaction failed: duplicate transaction or insufficient funds');
  });

  test('should throw an error for an invalid (non-positive) amount', async () => {
    const input: TransactionInput = {
      idempotentKey: 'txn-126',
      userId,
      amount: '-10',
      type: 'credit',
    };

    await expect(transact(input)).rejects.toThrow(
      'Invalid amount specified. The amount must be a positive number.'
    );
  });
});
