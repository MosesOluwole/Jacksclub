
import { DynamoDB } from 'aws-sdk';

export function buildAtomicUpdateExpression(
  attributeName: string,
  defaultValue: number,
  delta: number
): { updateExpression: string; expressionAttributeValues: { [key: string]: any } } {
  const updateExpression = `SET ${attributeName} = if_not_exists(${attributeName}, :default) + :delta`;
  const expressionAttributeValues = {
    ":default": defaultValue,
    ":delta": delta,
  };
  return { updateExpression, expressionAttributeValues };
}

export function buildAttributeNotExistsCondition(attributeName: string): string {
  return `attribute_not_exists(${attributeName})`;
}


export function buildTransactWriteParams(
  transactItems: DynamoDB.DocumentClient.TransactWriteItem[]
): DynamoDB.DocumentClient.TransactWriteItemsInput {
  return {
    TransactItems: transactItems,
  };
}

export function buildThresholdCondition(
  attributeName: string,
  threshold: number
): { conditionExpression: string; expressionAttributeValues: { [key: string]: any } } {
  const conditionExpression = `${attributeName} >= :min`;
  const expressionAttributeValues = {
    ":min": threshold,
  };
  return { conditionExpression, expressionAttributeValues };
}


export function transformDynamoError(error: any): Error {
  if (error.code === 'TransactionCanceledException') {
    return new Error('Transaction failed: duplicate transaction or insufficient funds');
  }
  return new Error(error.message || 'Unknown DynamoDB error');
}
