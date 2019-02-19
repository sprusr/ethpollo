import { SOLIDITY_GQL_TYPE_MAP } from './constants'
import { Contracts } from './types';

// convert solidity type to gql type
const solidityTypeToGql = (solidityType: string) => SOLIDITY_GQL_TYPE_MAP[solidityType] || 'Boolean';

// turn an array of contract defs into a gql schema
const generateContractSchema = (contracts: Contracts) => `
${
  contracts.map(({ contractName, abi }) => `
    type ${contractName}Query {
      ${
        abi.filter(({ type, constant }) => type === 'function' && constant).map(({ name }) => `
          ${name}: ${contractName}_${name}
        `)
      }
    }

    ${
      abi.filter(({ outputs }) => outputs.length > 0).map(({ name, outputs }) => `
        type ${contractName}_${name}: ${outputs.length === 1 ? solidityTypeToGql(outputs[0].type) : `{
          ${outputs.map(({ name: outputName, type }) => `
            ${outputName}: ${solidityTypeToGql(type)}
          `)}
        }`}
      `)
    }
  `)

}

type Query {
  ${
    contracts.map(({ contractName }) => `${contractName}: ${contractName}Query`)
  }
}
`;

export default generateContractSchema;
