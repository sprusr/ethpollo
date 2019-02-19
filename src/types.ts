export type Address = string;

export type ABIEntryArg = {
  name: string,
  type: string,
}

export type ABIEntry = {
  constant: boolean,
  inputs: Array<ABIEntryArg>,
  name: string,
  outputs: Array<ABIEntryArg>,
  payable: boolean,
  stateMutability: string,
  type: string,
  signature: string,
}

export type ABI = Array<ABIEntry>;

export type Contract = {
  contractName: string,
  abi: ABI,
  networks: {
    [network: string]: {
      address: Address
    }
  }
}

export type Contracts = Array<Contract>;
