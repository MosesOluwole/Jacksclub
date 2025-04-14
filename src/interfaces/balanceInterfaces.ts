export interface UserBalance {
    userId: string;
    balance: number;
  }
  
  export interface IBalanceRepository {
    getBalance(userId: string): Promise<number>;
  }
  