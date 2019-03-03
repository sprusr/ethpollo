import { AbiItem } from 'web3-utils';

/**
 * Convert from an object of named contract function arguments to a positional
 * array, according to the function's ABI entry.
 * @param objectArgs Named function arguments
 * @param abiItem Contract function ABI entry
 */
export const positionalArgsFromObject = (
  objectArgs: { [key: string]: any },
  { inputs }: AbiItem,
) => {
  if (!(inputs && inputs.length)) {
    if (Object.keys(objectArgs).length) {
      // tslint:disable-next-line:no-console
      console.warn('Arguments provided for method with no inputs');
    }
    return [];
  }
  return inputs.map((input) => {
    const objectArg = objectArgs[input.name];
    if (!objectArg) { throw new Error('Required input not provided'); }
    return objectArg;
  });
};
