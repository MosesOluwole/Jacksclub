import { DynamoDB } from 'aws-sdk';
import { TransactionService } from './transactionService';
import { TransactionInput } from '../interfaces/transactionInterfaces';
import { config } from '../config';

export async function transact(input: TransactionInput): Promise<void> {
  const documentClient = new DynamoDB.DocumentClient();
  const transactionService = new TransactionService(
    documentClient,
    config.userBalanceTable,
    config.transactionTable,
    config.defaultBalance
  );
  await transactionService.processTransaction(input);
}
