export type Address = string;

export interface ABIArg {
  name: string;
  type: string;
}

export interface ABIEntry {
  constant: boolean;
  inputs: ABIArg[];
  name: string;
  outputs: ABIArg[];
  payable: boolean;
  stateMutability: string;
  type: string;
  signature: string;
}

export type ABI = ABIEntry[];

export interface Contract {
  contractName: string;
  abi: ABI;
  networks: {
    [network: string]: {
      address: Address,
    },
  };
}

export type Contracts = Contract[];
