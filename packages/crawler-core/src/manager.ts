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
      WaitTimeSeconds: 1,
    }, options.awsConfig);
    this.worker = worker;
    this.priorityWorkCount = options.priorityWorkCount===undefined? 10 : options.priorityWorkCount; 
    this.normalWorkCount = options.normalWorkCount===undefined? 1 : options.normalWorkCount;
    this.HistoryConstructor = buildHistory(historyTableName, options.awsConfig);
  }
  /*
  async manage(): Promise<any>{
    console.log(new Date(), "fetch contracts..");
    let promises = [this.priorityQueue.receive(this.priorityWorkCount), this.normalQueue.receive(this.normalWorkCount)]
    const messages = (await Promise.all(promises)).flat();
    if(messages == null || messages.length === 0)
      return;
    const contracts: Contract[] = messages.map(message => JSON.parse(message.Body!));
    console.log(new Date(), "fetch history..");
    const histories: IHistory[] = await Promise.all(contracts.map(contract => this.HistoryConstructor.getOrCreate(contract.id)));
    let validations: boolean[] = contracts.map((contract, i) => histories[i].isValid(contract.trackingKey))
    console.log(new Date(), "do working..");
    let errors: any[] = (await Promise.all(contracts.map((contract, i) => this.worker.work(contract, histories[i]).then(t => null).catch(e => e)))).filter(r => r);
    for(let e of errors)
      console.log(e)
    const nextContracts = contracts.map(c => Object.assign(c, { trackingKey : new Date().getTime() + Math.random() }));
    console.log(new Date(), "update history..");
    const historyUpdeateResults = await Promise.all(histories.map((history, i) => history.save(nextContracts[i].trackingKey)));
    validations = validations.map((v, i) => historyUpdeateResults[i] && v);
    let normalContracts: Contract[] = [];
    let priorityContracts: Contract[] = [];
    console.log(new Date(), "push contracts..");
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
    await this.priorityQueue.delete(await promises[0]);
    await this.normalQueue.delete(await promises[1]);
    console.log(new Date(), "done");
  }*/
  async manage() {
    for(let i=0; i<this.priorityWorkCount; ++i){
      try {
        const [message] = await this.priorityQueue.receive(1);
        if(message === undefined){
          console.log("no message in priority queue.. skip");
          break;
        }
        const contract = JSON.parse(message.Body!);
        const history = await this.HistoryConstructor.getOrCreate(contract.id);
        if(history.isValid(contract.trackingKey)){
          await this.worker.work(contract, history);
          const nextContract = Object.assign(contract, { trackingKey : new Date().getTime() + Math.random() });
          if(await history.save(nextContract.trackingKey)) {
            if(history.isPriority())
              await this.priorityQueue.send([JSON.stringify(nextContract)]);
            else
              await this.normalQueue.send([JSON.stringify(nextContract)]);
          }
        }
        await this.priorityQueue.delete([message]);
      } catch(e) {
        console.log(e);
      }
    }
    for(let i=0; i<this.normalWorkCount; ++i) {
      try {
        const [message] = await this.normalQueue.receive(1);
        if(message === undefined){
          console.log("no message in normal queue.. skip");
          break;
        }
        const contract = JSON.parse(message.Body!);
        const history = await this.HistoryConstructor.getOrCreate(contract.id);
        if(history.isValid(contract.trackingKey)){
          await this.worker.work(contract, history);
          const nextContract = Object.assign(contract, { trackingKey : new Date().getTime() + Math.random() });
          if(await history.save(nextContract.trackingKey)) {
            if(history.isPriority())
              await this.priorityQueue.send([JSON.stringify(nextContract)]);
            else
              await this.normalQueue.send([JSON.stringify(nextContract)]);
          }
        }
        await this.normalQueue.delete([message]);
      } catch(e) {
        console.log(e);
      }
    }
  }
}
