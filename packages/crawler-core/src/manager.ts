import Queue from 'sqsqs';
import { IHistory, IHistoryConstructor, buildHistory } from './history';
import { Contract } from './contract';
import { IWorker } from './worker';

export interface IManagerOptions {
  priorityWorkCount?: number;
  normalWorkCount?: number;
  awsConfig?: any;
}
export class Manager {
  normalQueue: Queue;
  priorityQueue: Queue;
  worker: IWorker;
  priorityWorkCount: number;
  normalWorkCount: number;
  HistoryConstructor: IHistoryConstructor;
  constructor(
    priorityQueueUrl: string, 
    normalQueueUrl: string, 
    historyTableName: string,
    worker: IWorker, 
    options: IManagerOptions = {},
  ) {
    this.normalQueue = new Queue({
      QueueUrl: normalQueueUrl,
      WaitTimeSeconds: 1,
    }, options.awsConfig);
    this.priorityQueue = new Queue({
      QueueUrl: priorityQueueUrl,
    }, options.awsConfig);
    this.worker = worker;
    this.priorityWorkCount = options.priorityWorkCount || 10; 
    this.normalWorkCount = options.normalWorkCount || 1; 
    this.HistoryConstructor = buildHistory(historyTableName, options.awsConfig);
  }
  async manage(){
    const messages = (await Promise.all([this.priorityQueue.receive(this.priorityWorkCount), this.normalQueue.receive(this.normalWorkCount)])).flat();
    if(messages == null || messages.length === 0)
      return;
    const contracts: Contract[] = messages.map(message => JSON.parse(message.Body!));
    const histories: IHistory[] = await Promise.all(contracts.map(contract => this.HistoryConstructor.getOrCreate(contract.id)));
    let validations: boolean[] = contracts.map((contract, i) => histories[i].isValid(contract.trackingKey))
    await Promise.all(contracts.map((contract, i) => this.worker.work(contract, histories[i])));
    const nextContracts = contracts.map(c => Object.assign(c, { trackingKey : new Date().getTime() + Math.random() }));
    const historyUpdeateResults = await Promise.all(histories.map((history, i) => history.save(nextContracts[i].trackingKey)));
    validations = validations.map((v, i) => historyUpdeateResults[i] && v);
    let normalContracts: Contract[] = [];
    let priorityContracts: Contract[] = [];
    nextContracts.forEach((contract, i) => {
      if(!validations[i])
        return;
      if(histories[i].isPriority())
        priorityContracts.push(contract);
      else
        normalContracts.push(contract);
    });
    await this.normalQueue.send(normalContracts.map(c => JSON.stringify(c)));
    await this.priorityQueue.send(priorityContracts.map(c => JSON.stringify(c)));
    await this.priorityQueue.delete(messages.slice(0, this.priorityWorkCount));
    await this.normalQueue.delete(messages.slice(this.priorityWorkCount));
  }
}
