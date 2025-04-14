import { DynamoDB } from 'aws-sdk';
import { IBalanceRepository } from '../interfaces/balanceInterfaces';

export class DynamoDBBalanceRepository implements IBalanceRepository {
  private readonly tableName: string;
  private readonly documentClient: DynamoDB.DocumentClient;
  private readonly defaultBalance: number;

  constructor(documentClient: DynamoDB.DocumentClient, tableName: string, defaultBalance: number) {
    this.documentClient = documentClient;
    this.tableName = tableName;
    this.defaultBalance = defaultBalance;
  }

  async getBalance(userId: string): Promise<number> {
    const params = {
      TableName: this.tableName,
      Key: { userId },
      ProjectionExpression: 'balance',
    };

    try {
      const result = await this.documentClient.get(params).promise();
      if (result.Item && typeof result.Item.balance === 'number') {
        return result.Item.balance;
      }
    } catch (error) {
      console.error(`Error fetching balance for userId: ${userId}`, error);
    }
    return this.defaultBalance;
  }
}
