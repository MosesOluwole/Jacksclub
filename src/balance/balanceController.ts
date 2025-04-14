import { DynamoDB } from 'aws-sdk';
import { DynamoDBBalanceRepository } from './balanceRepository';
import { BalanceService } from './balanceService';
import { config } from '../config';

export async function retrieveCurrentBalance(input: { userId: string }): Promise<number> {
  const documentClient = new DynamoDB.DocumentClient();
  const repository = new DynamoDBBalanceRepository(documentClient, config.userBalanceTable, config.defaultBalance);
  const service = new BalanceService(repository);
  return await service.getCurrentBalance(input.userId);
}
