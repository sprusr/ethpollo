import { Operation, DocumentNode } from 'apollo-link';
import { hasDirectives, getDirectiveInfoFromField } from 'apollo-utilities';
import { Kind, visit, FieldNode } from 'graphql';

import { CONTRACT_DIRECTIVE } from '../constants';

export const isContractOperation = ({ query }: Operation) =>
  hasDirectives([CONTRACT_DIRECTIVE], query);

export const fieldHasDirective = (node: FieldNode, directive: string) =>
  Object.keys(getDirectiveInfoFromField(node, {}) || {}).some(dir => dir === directive);

export const separateContractDirectives = (document: DocumentNode) => {
  const contract: FieldNode[] = [];
  const query: DocumentNode = visit(document, {
    [Kind.FIELD]: node => {
      if (fieldHasDirective(node, CONTRACT_DIRECTIVE)) {
        contract.push(node);
        return null;
      }
    },
  });
  return { contract, query };
}

export const getArgsFromContractCallNode = (node: FieldNode) => {
  if (!node.arguments || !node.arguments.length) return [];
  const argsNode = node.arguments.find(({ name: { value: name }, value }) =>
    name === 'args' && value.kind === Kind.LIST && !!value.values.length);
  if (!argsNode || argsNode.value.kind !== Kind.LIST) return [];
  // TODO: should work for all kinds
  return argsNode.value.values.map(valueNode => valueNode.kind === Kind.INT ? valueNode.value : null);
}

export const makeCallTree = (alias: string, data: string, address: string): FieldNode => ({
  kind: Kind.FIELD,
  name: {
    kind: Kind.NAME,
    value: 'call',
  },
  alias: {
    kind: Kind.NAME,
    value: alias,
  },
  arguments: [
    {
      kind: Kind.ARGUMENT,
      name: {
        kind: Kind.NAME,
        value: 'data',
      },
      value: {
        kind: Kind.OBJECT,
        fields: [{
          kind: Kind.OBJECT_FIELD,
          name: {
            kind: Kind.NAME,
            value: 'to'
          },
          value: {
            kind: Kind.STRING,
            value: address,
          }
        }, {
          kind: Kind.OBJECT_FIELD,
          name: {
            kind: Kind.NAME,
            value: 'data'
          },
          value: {
            kind: Kind.STRING,
            value: data
          }
        }],
      },
    },
  ],
  selectionSet: {
    kind: Kind.SELECTION_SET,
    selections: [
      {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'data',
        }
      }
    ]
  }
});

