import { createHttpLink, HttpLink } from "apollo-link-http";
import { SchemaLink } from "apollo-link-schema";
import {
  introspectSchema,
  makeExecutableSchema,
  makeRemoteExecutableSchema,
  mergeSchemas,
  transformSchema,
} from "graphql-tools";

import { DEFAULT_URI } from "./constants";
import ContractQueryTransform from "./ContractQueryTransform";
import generateContractSchema from "./schemaGenerator";
import { Contracts } from "./types";

const init = async ({
  contracts = [],
  uri = DEFAULT_URI,
  linkOptions,
}: {
  contracts?: Contracts,
  uri?: string,
  linkOptions?: HttpLink.Options,
}) => {
  const link = createHttpLink({ uri, ...linkOptions });

  // tslint:disable-next-line:no-console
  console.log(generateContractSchema(contracts));

  // generate contract schema
  const contractSchema = makeExecutableSchema({
    typeDefs: generateContractSchema(contracts),
  });

  // load ethql schema
  const ethqlSchemaDefs = await introspectSchema(link);
  const ethqlSchema = makeRemoteExecutableSchema({
    link,
    schema: ethqlSchemaDefs,
  });

  // stitch the two schemas
  const mergedSchemas = mergeSchemas({
    schemas: [
      ethqlSchema,
      contractSchema,
    ],
  });

  // apply transforms
  const transforms = [new ContractQueryTransform(contracts)];
  const schema = transformSchema(
    mergedSchemas,
    transforms,
  );

  // return our custom schema link
  return new SchemaLink({ schema });
};

export default init;
