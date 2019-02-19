import { HttpLink } from 'apollo-link-http';
import { SchemaLink } from 'apollo-link-schema';
import {
  addMockFunctionsToSchema,
  introspectSchema,
  makeExecutableSchema,
  makeRemoteExecutableSchema,
  mergeSchemas,
  transformSchema,
} from 'graphql-tools';

import { DEBUG_MODE, DEFAULT_URI } from './constants';
import ContractQueryTransform from './ContractQueryTransform';
import generateContractSchema from './schemaGenerator';
import { Contracts } from './types';
import { debugTransform } from './utils';

const init = async ({ contracts = [], uri = DEFAULT_URI }: { contracts: Contracts, uri: string }) => {
  const link = new HttpLink({ uri });
  
  // generate contract schema
  const contractSchema = makeExecutableSchema({
    typeDefs: generateContractSchema(contracts)
  });
  addMockFunctionsToSchema({ schema: contractSchema });

  // load ethql schema
  const ethqlSchemaDefs = await introspectSchema(link);
  const ethqlSchema = makeRemoteExecutableSchema({
    schema: ethqlSchemaDefs,
    link,
  });

  // stitch the two schemas
  const mergedSchemas = mergeSchemas({
    schemas: [
      ethqlSchema,
      contractSchema,
    ],
  });

  // apply transforms
  const transforms = [
    DEBUG_MODE ? debugTransform : null,
    new ContractQueryTransform(contracts),
    DEBUG_MODE ? debugTransform : null,
  ];
  const schema = transformSchema(
    mergedSchemas,
    transforms,
  );

  // return our custom schema link
  return new SchemaLink({ schema });
}

export default init;
