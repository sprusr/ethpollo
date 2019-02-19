import { Request, Transform } from "graphql-tools";

import { Contracts } from "./types";

export default class ContractQueryTransform implements Transform {
  public contracts: Contracts;

  constructor(contracts: any) {
    this.contracts = contracts;
  }

  public transformRequest(originalRequest: Request) {
    return originalRequest;
  }

  public transformResult(result: any) {
    return result;
  }
}
