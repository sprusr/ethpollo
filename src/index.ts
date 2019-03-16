import { ApolloLink, FetchResult, NextLink, Operation } from 'apollo-link';
import { OperationDefinitionNode } from 'graphql';
import { set } from 'lodash';
import { AbiCoder } from 'web3-eth-abi';
import { AbiItem } from 'web3-utils';

import { MUTATION_TYPE, QUERY_TYPE } from './constants';
import { IQueryInfo } from './types';
import { extractCallQueries, isContractOperation, separateContractDirectives } from './utils';

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

    // set the new query on the operation
    operation.query = query;
    return operation;
  }

  public transformResult(result: FetchResult, operation: Operation) {
    if (!result.data) { return result; }

    const decoded = Object.entries(result.data).reduce((acc, [id, { data }]: [string, any]) => {
      const info = this.queryInfo[id] || {};
      switch (info.type) {
        case QUERY_TYPE:
          return {...acc, ...this.extractCallResult(id, data)};

        case MUTATION_TYPE:
          return {...acc, ...this.extractMutationResult(id, data)};

        default:
          return acc;
      }
    }, {});
    return {
      ...result,
      data: {...result.data, ...decoded},
    };
  }

  private extractCallResult(id: string, data: string) {
    const info = this.queryInfo[id];
    const abiEntry = this.abi.find((entry) => entry.name === info.name);
    if (!abiEntry) {
      // tslint:disable-next-line:no-console
      console.warn(`Could not decode call for function ${info.name}`);
      return {};
    }
    const decoded = this.abiCoder.decodeParameters(abiEntry.outputs || [], data);
    const typenameInfo = {
      [info.path[0]]: { __typename: null },
    };
    return set(typenameInfo, info.path, decoded);
  }

  private extractMutationResult(id: string, data: string) {
    // tslint:disable-next-line:no-console
    console.info('Mutation decoding coming soon');
    return {};
  }
}

export default Ethpollo;
