import { FieldNode, Kind } from 'graphql';

import { makeCallTree, getArgsFromContractCallNode } from './';
import { AbiItem } from 'web3-utils/types';
import { AbiCoder } from 'web3-eth-abi/types';

export const extractCallQueries = ({
  nodes,
  abi,
  abiCoder,
  address
}: {
  nodes: FieldNode[],
  abi: AbiItem[],
  abiCoder: AbiCoder,
  address: string
}) => 
  nodes.reduce((acc, query) => {
    // if no queries within, we won't do anything for this query
    if (!query.selectionSet) return acc;

    const callQueries = query.selectionSet.selections.reduce((queries, selection) => {
      if (selection.kind !== Kind.FIELD) return queries;

      // does the method actually exist in the abi
      const abiItem = abi.find(({ name, type, constant }) =>
        name === selection.name.value &&
        type === 'function' &&
        constant === true
      );
      if (!abiItem) return queries;

      // convert contract queries to calls
      return [...queries, createCallQuery({
        abiCoder,
        abiItem,
        address,
        args: getArgsFromContractCallNode(selection),
        contractAlias: query.alias ? query.alias.value : query.name.value,
        functionAlias: selection.alias ? selection.alias.value : selection.name.value,
      })];
    }, [] as FieldNode[]);
    
    return [...acc, ...callQueries];
  }, [] as FieldNode[]);

export const createCallQuery = ({
  contractAlias,
  functionAlias,
  abiItem,
  abiCoder,
  address,
  args
}: {
  contractAlias: string,
  functionAlias: string,
  abiItem: AbiItem,
  abiCoder: AbiCoder,
  address: string,
  args: any[]
}) => {
  const alias = `${contractAlias}__${functionAlias}`;
  const data = abiCoder.encodeFunctionCall(abiItem, args);
  return makeCallTree(alias, data, address);
};
