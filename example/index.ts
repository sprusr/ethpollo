import ethpollo from '../';
import fetch from 'node-fetch';

ethpollo({ contracts: [{
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
  }, {
    constant: true,
    name: 'coolMethod2',
    inputs: [{
      name: 'in1',
      type: 'uint256',
    }, {
      name: 'in2',
      type: 'uint256',
    }, {
      name: 'in3',
      type: 'uint256',
    }],
    outputs: [{
      name: 'returnValue',
      type: 'uint256',
    }, {
      name: 'returnValue2',
      type: 'uint256',
    }],
    payable: false,
    signature: '0xabc',
    stateMutability: 'view',
    type: 'function',
  }],
  networks: {},
}], uri: 'http://localhost:4000/graphql', linkOptions: { fetch } })
