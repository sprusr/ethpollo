import { DocumentNode, Operation } from 'apollo-link';
import { getDirectiveInfoFromField, hasDirectives } from 'apollo-utilities';
import { FieldNode, Kind, visit } from 'graphql';

import { CONTRACT_DIRECTIVE } from '../constants';

/**
 * For the given operation, determine whether its query contains the
 * `@contract` directive.
 * @param operation Operation containing the query to test
 */
export const isContractOperation = ({ query }: Operation) =>
  hasDirectives([CONTRACT_DIRECTIVE], query);

/**
 * Determine whether the specific given FieldNode contains the given directive
 * on the top level.
 * @param node FieldNode to test
 * @param directive Directive to test for
 */
export const fieldHasDirective = (node: FieldNode, directive: string) =>
  Object.keys(getDirectiveInfoFromField(node, {}) || {}).some((dir) => dir === directive);

/**
 * Return an object containing an array of nodes with `@contract` directives
 * from the provided document, and the original document with said nodes
 * removed.
 * @param document DocumentNode to separate
 */
export const separateContractDirectives = (document: DocumentNode) => {
  const contract: FieldNode[] = [];
  const fieldPath: string[] = [];
  const query: DocumentNode = visit(document, {
    [Kind.FIELD]: {
      enter: (node) => {
        fieldPath.push(node.name.value);

        // must have @contract directive and be top level of query
        if (fieldHasDirective(node, CONTRACT_DIRECTIVE)) {
          contract.push(node);
          return null;
        }
      },
      leave: () => {
        fieldPath.pop();
      },
    },
  });
  return { contract, query };
};

/**
 * Return a GraphQL directive AST used to track a contract call
 * @param id The nanoid generated id to use
 */
export const makeTrackerDirective = (id: string) => ({
  arguments: [{
    kind: Kind.ARGUMENT,
    name: {
      kind: Kind.NAME,
      value: 'id',
    },
    value: {
      kind: Kind.STRING,
      value: id,
    },
  }],
  kind: Kind.DIRECTIVE,
  name: {
    kind: Kind.NAME,
    value: 'ethpollo',
  },
});

export const getTrackerId = (field: FieldNode, args?: object) => {
  const directives = getDirectiveInfoFromField(field, args || {});
  if (!(directives.ethpollo && directives.ethpollo.id)) {
    throw new Error('Tracker directive not found');
  }
  return directives.ethpollo.id;
};

/**
 * Return a GraphQL query AST for the following, with provided alias, data and
 * to address:
 * ```graphql
 * {
 *   $alias: call(data: $data, to: $address) {
 *     data
 *   }
 * }
 * ```
 * @param alias Alias for the call query
 * @param data Data to be sent with the call
 * @param address Address of the contract to call
 */
export const makeCallTree = (alias: string, data: string, address: string): FieldNode => ({
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
        fields: [{
          kind: Kind.OBJECT_FIELD,
          name: {
            kind: Kind.NAME,
            value: 'to',
          },
          value: {
            kind: Kind.STRING,
            value: address,
          },
        }, {
          kind: Kind.OBJECT_FIELD,
          name: {
            kind: Kind.NAME,
            value: 'data',
          },
          value: {
            kind: Kind.STRING,
            value: data,
          },
        }],
        kind: Kind.OBJECT,
      },
    },
  ],
  kind: Kind.FIELD,
  name: {
    kind: Kind.NAME,
    value: 'call',
  },
  selectionSet: {
    kind: Kind.SELECTION_SET,
    selections: [
      {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'data',
        },
      },
    ],
  },
});
