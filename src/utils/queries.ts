import { argumentsObjectFromField } from 'apollo-utilities';
import { FieldNode, Kind } from 'graphql';
import nanoid from 'nanoid/generate';
import { AbiCoder } from 'web3-eth-abi';
import { AbiItem } from 'web3-utils';

import { QUERY_TYPE } from '../constants';
import { IQueryInfo } from '../types';
import { makeCallTree } from './ast';
import { positionalArgsFromObject } from './web3';

export const extractCallQueries = ({
  abi,
  abiCoder,
  address,
  nodes,
}: {
  abi: AbiItem[],
  abiCoder: AbiCoder,
  address: string,
  nodes: FieldNode[],
}) => {
  const queryInfo: IQueryInfo = {};
  const callQueries = nodes.reduce((acc, query) => {
    // if no function calls within, we won't do anything for this query
    if (!query.selectionSet) { return acc; }

    // convert each function call in this query to a call query
    const contractCallQueries = query.selectionSet.selections.reduce((queries, selection) => {
      if (selection.kind !== Kind.FIELD) { return queries; }

      const functionName = selection.name.value;
      const trackerId = nanoid('abcdefghijklmnopqrstuvwxyz', 10);
      const contractAlias = query.alias ? query.alias.value : query.name.value;
      const functionAlias = selection.alias ? selection.alias.value : functionName;

      // does the method actually exist in the abi
      const abiItem = abi.find(({ name, type, constant }) =>
        name === functionName &&
        type === 'function' &&
        constant === true,
      );
      if (!abiItem) {
        // tslint:disable-next-line:no-console
        console.warn('Tried to call a function that doesn\'t exist on the contract');
        return queries;
      }

      // keep track of info about the original query
      queryInfo[trackerId] = {
        includedFields: [], // TODO: implement - do we need it, or does apollo auto filter?
        name: functionName,
        path: [contractAlias, functionAlias],
        type: QUERY_TYPE,
      };

      // convert contract queries to calls
      return [...queries, createCallQuery({
        abiCoder,
        abiItem,
        address,
        args: argumentsObjectFromField(selection, {}) || {},
        trackerId,
      })];
    }, [] as FieldNode[]);
    return [...acc, ...contractCallQueries];
  }, [] as FieldNode[]);
  return { callQueries, queryInfo };
};

export const createCallQuery = ({
  abiCoder,
  abiItem,
  address,
  args,
  trackerId,
}: {
  abiCoder: AbiCoder,
  abiItem: AbiItem,
  address: string,
  args: object,
  trackerId: string,
}) => {
  const argsArray = positionalArgsFromObject(args, abiItem);
  const data = abiCoder.encodeFunctionCall(abiItem, argsArray);
  return makeCallTree(trackerId, data, address);
};
