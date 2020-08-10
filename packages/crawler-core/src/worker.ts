import Queue from 'sqsqs';
import { IHistory } from './history';
import { Contract } from './contract';

export interface IWorker {
  work(contract: Contract, history: IHistory): Promise<void>;
}
