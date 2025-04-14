import { IBalanceRepository } from '../interfaces/balanceInterfaces';

export class BalanceService {
  private readonly repository: IBalanceRepository;

  constructor(repository: IBalanceRepository) {
    this.repository = repository;
  }

  async getCurrentBalance(userId: string): Promise<number> {
    return this.repository.getBalance(userId);
  }
}
