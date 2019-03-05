<p align="center">
  <img alt="Ethpollo logo" src="docs/logo.png" width="400">
</p>

# RPC is dead, long live GraphQL!

Interact with Ethereum contracts using GraphQL. Please note: this is very new, and probably broken.

## Why does this exist?

Ethereum nodes recently got [a standard](https://eips.ethereum.org/EIPS/eip-1767) for introducing GraphQL APIs, intended as a more modern alternative to the traditional RPC API. This is great, because it means we can take all the fantastic tooling that already exists for GQL and use it in our dApps! But what this API doesn't include is any kind of decoding for contract data. That's where `ethpollo` comes in...

This project is a custom [link](https://www.apollographql.com/docs/link) for `apollo-client` which transforms requests to something Ethereum nodes understand, and responses back to what we can understand - all on the client side. For example, you could write a query similar the following:

```graphql
{
  SimpleStorage @contract {
    get
  }
}
```

The request will get turned into something like:

```graphql
{
  call(data="0x...")
}
```

But then the response will be converted back to:

```graphql
{
  SimpleStorage: {
    get: 1337
  }
}
```

Because it's totally client side, we can reap the benefits of the new API without adding in any element of centralisation. If that's not a concern for you and you want even greater control over decoding and further extensions, you should check out [EthQL](https://github.com/ConsenSys/ethql/). It's a server side wrapper around the base Ethereum GraphQL API with support for plugins. They're also the folks that helped get this project kick-started!

## Get started

Here's a very unassuming example with a pretty standard `apollo-client` setup.

```javascript
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { concat } from 'apollo-link'
import gql from 'graphql-tag'

const CONTRACT_NAME = 'SimpleStorage'
const CONTRACT_ADDRESS = '0x...'
const CONTRACT_ABI = [...]
const ETHQL_ENDPOINT = 'http://localhost:4000/graphql'

const ethpollo = new Ethpollo(
  CONTRACT_NAME,
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
)

const http = new HttpLink({ uri: ETHQL_ENDPOINT })

const client = new ApolloClient({
  link: concat(ethpollo, http),
  cache: new InMemoryCache(),
})

const query = gql`{
  SimpleStorage @contract {
    get
  }
}`

client.query({ query }).then(console.log)
```

More docs coming soon to [ethpollo.dev](https://ethpollo.dev).

## Future plans

Right now ethpollo has some way to go! It definitely feels like this could be a great alternative to [web3.js](https://github.com/ethereum/web3.js/), but it first needs to support everything that can do. The short term roadmap looks something like the following:

- [ ] Support parsing event logs
- [ ] Suport calling non-constant functions (signing and sending transactions)
- [ ] Support fetching additional data about addresses in the same query

If you have longer term ideas, it'd be great to hear them. You could consider contributing...

## Contributing

If you're interested in contributing, that's great! Come hang out on the [EthQL Gitter](https://gitter.im/ethql/Lobby) and let's get some ideas going.
