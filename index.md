---
# You don't need to edit this file, it's empty on purpose.
# Edit theme's home layout instead if you wanna make some changes
# See: https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: logoheader
---

`ethpollo` is a cutom `apollo-client` [link](https://www.apollographql.com/docs/link/) for interacting with Ethereum contracts via the new GraphQL API. It lets you fetch contract data by writing queries like:

```graphql
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

More info coming soon. Check out the code [on GitHub](https://github.com/sprusr/ethpollo).
