import gql from 'graphql-tag';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import fetch from 'node-fetch';

import ethpollo from '../';

(async () => {
  const link = await ethpollo({ contracts: [{
    contractName: 'MyContract',
    abi: [{
      constant: true,
      name: 'coolMethod',
      inputs: [],
      outputs: [{
        name: 'returnValue',
        type: 'uint256',
      }],
      payable: false,
      signature: '0xabc',
      stateMutability: 'view',
      type: 'function',
    }],
    networks: {
      0: {
        address: '0x0cB0079936dCE60FcBa8EFF2C76f1ee64b303BAd',
      },
    },
  }], uri: 'http://localhost:4000/graphql', linkOptions: { fetch } })
  const client = new ApolloClient({
    link,
    cache: new InMemoryCache()
  });
  await client.query({ query: gql`
  {
    MyContract {
      result: coolMethod
    }
  }
  ` })
})();
