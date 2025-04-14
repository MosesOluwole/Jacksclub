import { DynamoDB } from 'aws-sdk';
import { retrieveCurrentBalance } from '../src/balance/balanceController';

const mockGetInstance = jest.fn();
const mockGetPromise = jest.fn();

jest.mock('aws-sdk', () => {
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => ({
        get: (params: any) => {
          mockGetInstance(params);
          return { promise: mockGetPromise };
        },
      })),
    },
  };
});

describe('Balance Controller - retrieveCurrentBalance', () => {
  const userId = '1';
  const defaultBalance = 100;

  beforeEach(() => {
    mockGetInstance.mockClear();
    mockGetPromise.mockClear();
  });

  test('should return the user balance if found', async () => {
    mockGetPromise.mockResolvedValueOnce({ Item: { balance: 250 } });
    const balance = await retrieveCurrentBalance({ userId });
    expect(balance).toBe(250);
    expect(mockGetInstance).toHaveBeenCalledWith({
      TableName: expect.any(String),
      Key: { userId },
      ProjectionExpression: 'balance',
    });
  });

  test('should return default balance if record not found', async () => {
    mockGetPromise.mockResolvedValueOnce({});
    const balance = await retrieveCurrentBalance({ userId });
    expect(balance).toBe(defaultBalance);
  });

  test('should return default balance if an error occurs', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetPromise.mockRejectedValueOnce(new Error('DynamoDB error'));
    const balance = await retrieveCurrentBalance({ userId });
    expect(balance).toBe(defaultBalance);
    (console.error as jest.Mock).mockRestore();
  });
});
