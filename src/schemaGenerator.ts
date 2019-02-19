import { SOLIDITY_GQL_TYPE_MAP } from "./constants";
import { ABIArg, Contract, Contracts } from "./types";

// convert solidity type to gql type
const solidityToGqlType = (solidityType: string) => SOLIDITY_GQL_TYPE_MAP[solidityType] || "Boolean";

const generateFunctionInputs = (inputs: ABIArg[]) => `(${
  inputs.reduce((acc: string, { name, type }) => acc += `${name}: ${solidityToGqlType(type)}, `, "").slice(0, -2)
})`;

const generateContractQuery = ({ contractName, abi }: Contract) => `
type ${contractName}Query {
  ${abi.filter(({ type, constant }) => type === "function" && constant).map(({ name, inputs, outputs }) => `
    ${name}${
      inputs.length > 0 && generateFunctionInputs(inputs)
    }: ${
      outputs.length === 1 ? solidityToGqlType(outputs[0].type) : `${contractName}_${name}`
    }
  `).reduce((acc, curr) => acc += curr, "")
  }
}

${abi.filter(({ outputs }) => outputs.length > 1).map(({ name, outputs }) => `
  type ${contractName}_${name} {
    ${outputs.map(({ name: outputName, type }) => `
      ${outputName}: ${solidityToGqlType(type)}
    `).reduce((acc, curr) => acc += curr, "")}
  }
`).reduce((acc, curr) => acc += curr, "")
}
`;

const generateRootQuery = (contracts: Contracts) => `
type Query {
  ${contracts.map(({ contractName }) => `
    ${contractName}: ${contractName}Query
  `).reduce((acc, curr) => acc += curr, "")}
}
`;

// turn an array of contract defs into a gql schema
const generateContractSchema = (contracts: Contracts) => `
${contracts.map(generateContractQuery).reduce((acc, curr) => acc += curr, "")}

${generateRootQuery(contracts)}
`;

export default generateContractSchema;
