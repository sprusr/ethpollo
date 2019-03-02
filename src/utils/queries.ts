import { FieldNode, Kind } from 'graphql';
import { argumentsObjectFromField, getDirectiveInfoFromField } from 'apollo-utilities';
import { AbiItem } from 'web3-utils/types';
import { AbiCoder } from 'web3-eth-abi/types';
import nanoid from 'nanoid/generate';
import { set } from 'lodash';

import { makeCallTree } from './ast';
import { positionalArgsFromObject } from './web3';
import { QueryInfo, QueryInfoItem } from '../types';

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
  const queryInfo: QueryInfo = {};
  const callQueries = nodes.reduce((acc, query) => {
    // if no function calls within, we won't do anything for this query
    if (!query.selectionSet) return acc;

    // convert each function call in this query to a call query
    const callQueries = query.selectionSet.selections.reduce((queries, selection) => {
      if (selection.kind !== Kind.FIELD) return queries;

      const functionName = selection.name.value;
      const trackerId = nanoid('abcdefghijklmnopqrstuvwxyz', 10);
      const contractAlias = query.alias ? query.alias.value : query.name.value;
      const functionAlias = selection.alias ? selection.alias.value : functionName;

      // does the method actually exist in the abi
      const abiItem = abi.find(({ name, type, constant }) =>
        name === functionName &&
        type === 'function' &&
        constant === true
      );
      if (!abiItem) {
        console.warn('Tried to call a function that doesn\'t exist on the contract');
        return queries;
      }

      // keep track of info about the original query
      queryInfo[trackerId] = {
        path: [contractAlias, functionAlias],
        name: functionName,
        includedFields: [], // TODO: implement - do we need it, or does apollo auto filter?
      }

      // convert contract queries to calls
      return [...queries, createCallQuery({
        abiCoder,
        abiItem,
        address,
        args: argumentsObjectFromField(selection, {}) || {},
        trackerId,
      })];
    }, [] as FieldNode[]);
    return [...acc, ...callQueries];
  }, [] as FieldNode[]);
  return { callQueries, queryInfo };
}

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
  args: Object,
  trackerId: string,
}) => {
  const argsArray = positionalArgsFromObject(args, abiItem);
  const data = abiCoder.encodeFunctionCall(abiItem, argsArray);
  return makeCallTree(trackerId, data, address);
};


export const extractCallResults = (data: { [key: string]: any } | undefined, queryInfo: QueryInfo) => {
  if (!data) return data;

  return Object.keys(data)
    .filter(key => !!queryInfo[key])
    .reduce((results, key) => {
      const info = queryInfo[key];

      // get this call result and check there was data returned
      const result = results[key];
      if (!result.data) {
        console.warn('No data returned from call');
        return result;
      }
      
      // parse data and set at original path
      const parsedResult = parseCallResult(result.data, info);
      set(results, info.path, parsedResult);
      
      // set __typename (is this allowed?)
      results[info.path[0]].__typename = '';

      // remove raw result
      delete results[key];

      // return new value
      return results;
    }, { ...data } as { [key: string]: any });
}

export const parseCallResult = (data: string, info: QueryInfoItem) => ({});
