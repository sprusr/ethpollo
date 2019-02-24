import { Request, Transform } from 'graphql-tools';
import { visit, Kind } from 'graphql';
import { AbiCoder } from 'web3-eth-abi';

import { Contracts } from "./types";
import { makeCallTree } from './ast';

const abiCoder = new AbiCoder();

export default class ContractQueryTransform implements Transform {
  public contracts: Contracts;

  constructor(contracts: any) {
    this.contracts = contracts;
  }

  public transformRequest(originalRequest: Request) {
    const document = originalRequest.document;
    const fieldPath = [];
    const newNodes = [];
    const newDocument = visit(document, {
      [Kind.FIELD]: {
        enter: node => {
          fieldPath.push(node.name.value);

          // work out if we're a function call
          if (fieldPath.length !== 2) return;
          const contract = this.contracts.find(({ contractName }) => fieldPath[0] === contractName);
          if (!contract) return;
          const func = contract.abi.find(({ name }) => fieldPath[1] === name);

          // if we should call it
          if (func && func.type === 'function' && func.constant) {
            const data = abiCoder.encodeFunctionCall({
              name: func.name,
              type: 'function',
              inputs: func.inputs,
            }, []); // TODO: get inputs from node
            newNodes.push(makeCallTree(`${contract.contractName}_${func.name}_call`, data, contract.networks[0].address))
          }
        },
        leave: node => {
          fieldPath.pop();
        },
      },
    });
    newDocument.definitions[0].selectionSet.selections.push(...newNodes);
    return {
      ...originalRequest,
      document: newDocument,
    };
  }

  public transformResult(result: any) {
    const contractResults = Object.keys(result.data).reduce((acc, key) => {
      if (key.match(/^[A-Za-z0-9]+\_[A-Za-z0-9]+\_call$/)) {
        const [contractName, functionName] = key.split('_');
        const contract = this.contracts.find(({ contractName: name }) => contractName === name);
        const func = contract.abi.find(({ name }) => functionName === name);
        const decoded = abiCoder.decodeParameters(func.outputs, result[key].data);

        return { ...acc, [contractName]: { ...acc[contractName], [functionName]: decoded }};
      }
    }, {});
    return { ...result, data: { ...result.data, ...contractResults } };
  }
}
