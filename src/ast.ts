import { Kind } from 'graphql';

export const makeCallTree = (alias: string, data: string, address: string) => ({
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
