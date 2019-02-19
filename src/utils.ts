export const debugTransform = {
  transformRequest: (request: any) => {
    console.log(`[ETHPOLLO] Request:`, request)
    return request;
  },
  transformResult: (result: any) => {
    console.log(`[ETHPOLLO] Result:`, result)
    return result;
  },
};
