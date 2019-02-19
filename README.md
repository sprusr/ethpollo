# ethpollo

Client side EthQL wrapper built with `apollo-client`. Performs query transforms client side in order to encode contract function calls and decode responses. Given information about a contract, `ethpollo` allows for queries of the form:

```gql
{
  CryptoKitties {
    totalSupply
    ownerOf(id: 1337) {
      address
      balance
    }
  }
}
```
