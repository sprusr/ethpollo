import { concat } from 'apollo-link';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { HttpLink } from 'apollo-link-http';
import { AbiItem } from 'web3-utils/types';
import gql from 'graphql-tag';

import 'unfetch/polyfill';

import Ethpollo from '../src';

const SimpleStorageABI: AbiItem[] = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "x",
        "type": "uint256"
      }
    ],
    "name": "set",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "constant": true,
    "inputs": [],
    "name": "get",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function",
  }
];

test('runs', async () => {
  const ethpollo = new Ethpollo(
    'SimpleStorage',
    '0xC4d681Ebb822410F3C7446081D23016583d1f9c7',
    SimpleStorageABI,
  );

  const http = new HttpLink({ uri: 'http://localhost:4000/graphql' });

  const client = new ApolloClient({
    link: concat(ethpollo, http),
    cache: new InMemoryCache(),
  });

  // const query = gql`{
  //   MyContract @contract {
  //     myMethod
  //     myMethodWithArgs(args: ["myArg", 20])
  //     myMethodWithMultipleReturns {
  //       firstReturn
  //       secondReturn
  //     }
  //     myMethodWithArgsAndNamedReturn(args: [1, 2, 3]) {
  //       namedReturn
  //     }
  //   }
  //   block(number: "0x0") {
  //     hash
  //   }
  // }`;

  const query = gql`{
    SimpleStorage @contract {
      get
    }
  }`;

  const result = await client.query({ query });
  console.log(JSON.stringify(result));
});
