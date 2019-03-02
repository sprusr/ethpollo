import { ApolloLink, Operation, NextLink, FetchResult } from 'apollo-link';
import { AbiItem } from 'web3-utils/types';
import { AbiCoder } from 'web3-eth-abi';
import { OperationDefinitionNode } from 'graphql';

import { isContractOperation, separateContractDirectives, extractCallQueries, extractCallResults } from './utils';
import { QueryInfo } from './types';

class Ethpollo extends ApolloLink {
  abi: AbiItem[];
  abiCoder: AbiCoder;
  address: string;
  contractName: string;
  queryInfo: QueryInfo;

  constructor(contractName: string, address: string, abi: AbiItem[]) {
    super();
    this.abi = abi;
    this.abiCoder = new AbiCoder();
    this.address = address;
    this.contractName = contractName;
    this.queryInfo = {};
  }

  request(operation: Operation, forward: NextLink) {
    // transform the request to what's supported by EIP 1767
    const transformedOperation = this.transformRequest(operation);

    // if the result of the transform is falsy, we want to skip over
    if (!transformedOperation) return forward(operation);

    // forward the request and map the response
    return forward(transformedOperation).map(result => this.transformResult(result, operation));
  }

  transformRequest(operation: Operation) {
    // if there's no contract stuff, don't worry about it
    if (!isContractOperation(operation)) return;

    // extract relevant directives from operation
    const { contract: contractFields, query } = separateContractDirectives(operation.query);

    // filter out queries for our contract
    const relevantContractFields = contractFields.filter(({ name: { value: name } }) => name === this.contractName);

    // if there's nothing for our contract, do nothing
    if (!relevantContractFields.length) return;

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
    console.log(JSON.stringify(contractFields));
    console.log(JSON.stringify(query));

    // set the new query on the operation
    operation.query = query;
    return operation;
  }

  transformResult(result: FetchResult, operation: Operation) {
    const dataWithCalls = extractCallResults(result.data, this.queryInfo);
    console.log(result, dataWithCalls);
    return {
      ...result,
      data: dataWithCalls,
    };
  }
}

export default Ethpollo;
