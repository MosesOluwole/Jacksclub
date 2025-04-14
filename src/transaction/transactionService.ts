import { DynamoDB } from 'aws-sdk';
import { TransactionInput } from '../interfaces/transactionInterfaces';
import {
  buildAtomicUpdateExpression,
  buildAttributeNotExistsCondition,
  buildTransactWriteParams,
  buildThresholdCondition,
  transformDynamoError,
} from '../helpers/dynamodbHelpers';

export class TransactionService {
  private readonly documentClient: DynamoDB.DocumentClient;
  private readonly userBalanceTable: string;
  private readonly transactionTable: string;
  private readonly defaultBalance: number;

  constructor(
    documentClient: DynamoDB.DocumentClient,
    userBalanceTable: string,
    transactionTable: string,
    defaultBalance: number
  ) {
    this.documentClient = documentClient;
    this.userBalanceTable = userBalanceTable;
    this.transactionTable = transactionTable;
    this.defaultBalance = defaultBalance;
  }

  public async processTransaction(input: TransactionInput): Promise<void> {
    const { idempotentKey, userId, amount, type } = input;
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid amount specified. The amount must be a positive number.');
    }

    const delta = type === 'credit' ? numericAmount : -numericAmount;

    const { updateExpression, expressionAttributeValues } = buildAtomicUpdateExpression(
      'balance',
      this.defaultBalance,
      delta
    );

    const updateOperation: DynamoDB.DocumentClient.TransactWriteItem = {
      Update: {
        TableName: this.userBalanceTable,
        Key: { userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: { ...expressionAttributeValues },
      },
    };

    if (type === 'debit') {
      const thresholdCondition = buildThresholdCondition("if_not_exists(balance, :default) + :delta", 0);
      if (updateOperation.Update) {
        updateOperation.Update.ConditionExpression = thresholdCondition.conditionExpression;
      }
      if (updateOperation.Update) {
        updateOperation.Update.ExpressionAttributeValues = {
          ...updateOperation.Update.ExpressionAttributeValues,
          ...thresholdCondition.expressionAttributeValues,
        };
      }
    }

    const putOperation: DynamoDB.DocumentClient.TransactWriteItem = {
      Put: {
        TableName: this.transactionTable,
        Item: {
          idempotentKey,
          userId,
          amount: numericAmount,
          type,
          timestamp: new Date().toISOString(),
        },
        ConditionExpression: buildAttributeNotExistsCondition('idempotentKey'),
      },
    };

    const params = buildTransactWriteParams([updateOperation, putOperation]);

    try {
      await this.documentClient.transactWrite(params).promise();
    } catch (error: any) {
      throw transformDynamoError(error);
    }
  }
}
