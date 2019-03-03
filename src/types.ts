export interface IQueryInfoItemField {
  // name of the result field
  name: string;
  // name to use in the response
  alias?: string;
}

// TODO: replace `path` in favour of `contract` and `alias`
export interface IQueryInfoItem {
  // path in the original query
  path: string[];
  // name of the function/event
  name: string;
  // requested result fields
  includedFields: IQueryInfoItemField[];
}

export interface IQueryInfo {
  [id: string]: IQueryInfoItem;
}
