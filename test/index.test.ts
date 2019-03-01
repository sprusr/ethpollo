import { concat } from 'apollo-link';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { HttpLink } from 'apollo-link-http';
import gql from 'graphql-tag';

import 'unfetch/polyfill';

import Ethpollo from '../src';

test('runs', async () => {
  const ethpollo = new Ethpollo('MyContract', '', [{
    name: 'myMethod',
    type: 'function',
  }]);

  const http = new HttpLink({ uri: 'http://localhost:4000/graphql' });

  const client = new ApolloClient({
    link: concat(ethpollo, http),
    cache: new InMemoryCache(),
  });

  const query = gql`{
    MyContract @contract {
      myMethod
      myMethodWithArgs(args: ["myArg", 20])
      myMethodWithMultipleReturns {
        firstReturn
        secondReturn
      }
      myMethodWithArgsAndNamedReturn(args: [1, 2, 3]) {
        namedReturn
      }
    }
    block(number: "0x0") {
      hash
    }
  }`;

  const result = await client.query({ query });
  console.log(result);
});
