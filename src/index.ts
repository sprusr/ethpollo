import { ApolloLink, Operation, NextLink, FetchResult } from 'apollo-link';
import { AbiItem } from 'web3-utils/types';
import { AbiCoder } from 'web3-eth-abi';
import { OperationDefinitionNode } from 'graphql';

import { isContractOperation, separateContractDirectives, extractCallQueries } from './utils';

class Ethpollo extends ApolloLink {
  abi: AbiItem[];
  abiCoder: AbiCoder;
  address: string;
  contractName: string;

  constructor(contractName: string, address: string, abi: AbiItem[]) {
    super();
    this.abi = abi;
    this.abiCoder = new AbiCoder();
    this.address = address;
    this.contractName = contractName;
  }

  request(operation: Operation, forward: NextLink) {
    // transform the request to what's supported by EIP 1767
    const transformedOperation = this.transformRequest(operation);

    // if the result of the transform is falsy, we want to skip over
    if (!transformedOperation) return forward(operation);

    // return observable which handles response
    const observer = forward(transformedOperation);
    observer.subscribe({
      next: result => this.transformResult(result, operation),
      error: this.handleError,
    });
    return observer;
  }

  transformRequest(operation: Operation) {
    // if there's no contract stuff, don't worry about it
    if (!isContractOperation(operation)) return;

    // extract relevant directives from operation
    const { contract, query } = separateContractDirectives(operation.query);

    // filter out queries for our contract
    const relevantQueries = contract.filter(({ name: { value: name } }) => name === this.contractName);

    // if there's nothing for our contract, do nothing
    if (!relevantQueries.length) return;

    // convert contract queries to calls
    const callQueries = extractCallQueries({
      nodes: relevantQueries,
      abi: this.abi,
      abiCoder: this.abiCoder,
      address: this.address
    });

    // set queries on main query to be sent
    // TODO: find a neater way to do this
    (query.definitions[0] as OperationDefinitionNode).selectionSet.selections =
      [...(query.definitions[0] as OperationDefinitionNode).selectionSet.selections, ...callQueries];

    // for debugging
    console.log(JSON.stringify(contract));
    console.log(JSON.stringify(query));

    // set the new query on the operation
    operation.query = query;
    return operation;
  }

  transformResult(result: FetchResult, operation: Operation) {
    return result;
  }

  handleError(error: any) {
    throw new Error(error);
  }
}

export default Ethpollo;
