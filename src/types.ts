import { MUTATION_TYPE, QUERY_TYPE } from './constants';

export interface INodeInfoItemField {
  // name of the result field
  name: string;
  // name to use in the response
  alias?: string;
}

export type RequestType = typeof QUERY_TYPE | typeof MUTATION_TYPE;

// TODO: replace `path` in favour of `contract` and `alias`
export interface INodeInfoItem {
  // query or mutation
  type: RequestType;
  // path in the original query
  path: string[];
  // name of the function/event
  name: string;
  // requested result fields
  includedFields: INodeInfoItemField[];
}

export interface INodeInfo {
  [id: string]: INodeInfoItem;
}
