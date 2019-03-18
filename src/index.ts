import { ApolloLink, FetchResult, NextLink, Operation } from 'apollo-link';
import { argumentsObjectFromField } from 'apollo-utilities';
import { FieldNode, Kind, OperationDefinitionNode } from 'graphql';
import { set } from 'lodash';
import nanoid from 'nanoid/generate';
import { AbiCoder } from 'web3-eth-abi';
import { AbiItem } from 'web3-utils';

import { MUTATION_TYPE, QUERY_TYPE } from './constants';
import { INodeInfo } from './types';
import {
  isContractOperation,
  makeCallTree,
  positionalArgsFromObject,
  separateContractDirectives,
} from './utils';

class Ethpollo extends ApolloLink {
  public abi: AbiItem[];
  public abiCoder: AbiCoder;
  public address: string;
  public contractName: string;
  public nodeInfo: INodeInfo;

  constructor(contractName: string, address: string, abi: AbiItem[]) {
    super();
    this.abi = abi;
    this.abiCoder = new AbiCoder();
    this.address = address;
    this.contractName = contractName;
    this.nodeInfo = {};
  }

  public request(operation: Operation, forward: NextLink) {
    // transform the request to what's supported by EIP 1767
    const transformedOperation = this.transformRequest(operation);

    // if the result of the transform is falsy, we want to skip over
    if (!transformedOperation) { return forward(operation); }

    // forward the request and map the response
    return forward(transformedOperation).map((result) => this.transformResult(result, operation));
  }

  private transformRequest(operation: Operation) {
    // if there's no contract stuff, don't worry about it
    if (!isContractOperation(operation)) { return; }

    // TODO: combine these two functions
    // extract relevant directives from operation
    const { contract: contractFields, query } = separateContractDirectives(operation.query);
    // filter out queries for our contract
    const relevantContractFields = contractFields.filter(({ name: { value: name } }) => name === this.contractName);

    // if there's nothing for our contract, do nothing
    if (!relevantContractFields.length) { return; }

    const nodes = relevantContractFields.reduce((acc, node) => {
      // if no function calls within, we won't do anything for this query
      if (!node.selectionSet) { return acc; }

      // convert each function call in this query to a call query
      const contractCallQueries = node.selectionSet.selections.reduce((queries, selection) => {
        if (selection.kind !== Kind.FIELD || selection.name.value === '__typename') {
          return queries;
        }

        const functionName = selection.name.value;
        const trackerId = nanoid('abcdefghijklmnopqrstuvwxyz', 10);
        const contractAlias = node.alias ? node.alias.value : node.name.value;
        const functionAlias = selection.alias ? selection.alias.value : functionName;

        // does the method actually exist in the abi
        const abiItem = this.abi.find(({ name }) => name === functionName);
        if (!abiItem) {
          // tslint:disable-next-line:no-console
          console.warn('Tried to call a function that doesn\'t exist on the contract');
          return queries;
        }

        // keep track of info about the original query
        this.nodeInfo[trackerId] = {
          // TODO: implement - do we need it, or does apollo auto filter?
          includedFields: [],
          name: functionName,
          path: [contractAlias, functionAlias],
          type: QUERY_TYPE,
        };

        if (abiItem.type === 'function' && abiItem.constant) {
          // TODO: do we need to pass variables?
          const args = argumentsObjectFromField(selection, {}) || {};
          return [...queries, this.encodeCall(trackerId, functionName, args)];
        }

        return queries;
      }, [] as FieldNode[]);
      return [...acc, ...contractCallQueries];
    }, [] as FieldNode[]);

    // set queries on main query to be sent
    // TODO: find a neater way to do this
    (query.definitions[0] as OperationDefinitionNode).selectionSet.selections =
      [...(query.definitions[0] as OperationDefinitionNode).selectionSet.selections, ...nodes];

    // set the new query on the operation
    operation.query = query;
    return operation;
  }

  private transformResult(result: FetchResult, operation: Operation) {
    if (!result.data) { return result; }

    const decoded = Object.entries(result.data).reduce((acc, [id, { data }]: [string, any]) => {
      const info = this.nodeInfo[id] || {};
      switch (info.type) {
        case QUERY_TYPE:
          return {...acc, ...this.decodeCall(id, data)};

        case MUTATION_TYPE:
          return {...acc, ...this.decodeMutation(id, data)};

        default:
          return acc;
      }
    }, {});
    return {
      ...result,
      data: {...result.data, ...decoded},
    };
  }

  private encodeCall(id: string, functionName: string, args: object) {
    // this will always be found, so cast to type
    const abiItem = this.abi.find(({ name }) => name === functionName) as AbiItem;

    // encode call query and return ast representation
    const argsArray = positionalArgsFromObject(args, abiItem);
    const data = this.abiCoder.encodeFunctionCall(abiItem, argsArray);
    return makeCallTree(id, data, this.address);
  }

  private decodeCall(id: string, data: string) {
    const info = this.nodeInfo[id];
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

  private decodeMutation(id: string, data: string) {
    // tslint:disable-next-line:no-console
    console.info('Mutation decoding coming soon');
    return {};
  }
}

export default Ethpollo;
