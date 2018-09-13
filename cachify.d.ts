import * as LRU from 'lru-cache';
export declare const joinN: (n: number) => (...args: any[]) => string;
/**
 * Takes an async function *f* that does some requests with a number of string arguments,
 * which must form a unique combination,
 * and returns a similar function *f'* that caches the results based on the combination.
 * All other args given to *f* must not influence the result.
 *
 * By default, the tuple is hashed by simply joining the strings.
 */
export declare function cachify<A extends [], T>(f: (...args: A) => Promise<T>, options?: LRU.Options<string, T | Promise<T> | Error>, hash?: (...args: string[]) => string, keepError?: (err: Error) => number): (...args: A) => Promise<T>;
