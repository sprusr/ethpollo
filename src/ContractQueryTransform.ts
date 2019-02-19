import { Request, Transform } from 'graphql-tools';

import { Contracts } from './types';

export default class ContractQueryTransform implements Transform {
  contracts: Contracts;

  constructor(contracts: any) {
    this.contracts = contracts;
  }

  transformRequest(originalRequest: Request) {
    return originalRequest;
  }

  transformResult(result: any) {
    return result;
  }
}
