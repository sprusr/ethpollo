import { ApolloLink, FetchResult, NextLink, Operation } from 'apollo-link';
import { OperationDefinitionNode } from 'graphql';
import { AbiCoder } from 'web3-eth-abi';
import { AbiItem } from 'web3-utils';

import { IQueryInfo } from './types';
import { extractCallQueries, extractCallResults, isContractOperation, separateContractDirectives } from './utils';

class Ethpollo extends ApolloLink {
  public abi: AbiItem[];
  public abiCoder: AbiCoder;
  public address: string;
  public contractName: string;
  public queryInfo: IQueryInfo;

  constructor(contractName: string, address: string, abi: AbiItem[]) {
    super();
    this.abi = abi;
    this.abiCoder = new AbiCoder();
    this.address = address;
    this.contractName = contractName;
    this.queryInfo = {};
  }

  public request(operation: Operation, forward: NextLink) {
    // transform the request to what's supported by EIP 1767
    const transformedOperation = this.transformRequest(operation);

    // if the result of the transform is falsy, we want to skip over
    if (!transformedOperation) { return forward(operation); }

    // forward the request and map the response
    return forward(transformedOperation).map((result) => this.transformResult(result, operation));
  }

  public transformRequest(operation: Operation) {
    // if there's no contract stuff, don't worry about it
    if (!isContractOperation(operation)) { return; }

    // extract relevant directives from operation
    const { contract: contractFields, query } = separateContractDirectives(operation.query);

    // filter out queries for our contract
    const relevantContractFields = contractFields.filter(({ name: { value: name } }) => name === this.contractName);

    // if there's nothing for our contract, do nothing
    if (!relevantContractFields.length) { return; }

    // convert contract queries to calls
    const { callQueries, queryInfo } = extractCallQueries({
      abi: this.abi,
      abiCoder: this.abiCoder,
      address: this.address,
      nodes: relevantContractFields,
    });

    // update the queries we're keeping track of
    this.queryInfo = { ...this.queryInfo, ...queryInfo };

    // set queries on main query to be sent
    // TODO: find a neater way to do this
    (query.definitions[0] as OperationDefinitionNode).selectionSet.selections =
      [...(query.definitions[0] as OperationDefinitionNode).selectionSet.selections, ...callQueries];

    // for debugging
    // tslint:disable-next-line:no-console
    console.log(JSON.stringify(contractFields));
    // tslint:disable-next-line:no-console
    console.log(JSON.stringify(query));

    // set the new query on the operation
    operation.query = query;
    return operation;
  }

  public transformResult(result: FetchResult, operation: Operation) {
    const dataWithCalls = extractCallResults(result.data, this.queryInfo);
    // tslint:disable-next-line:no-console
    console.log(result, dataWithCalls);
    return {
      ...result,
      data: dataWithCalls,
    };
  }
}

export default Ethpollo;
