import * as LRU from 'lru-cache'

export const joinN = (n:number) => (...args) => args.slice(0, n).join('@')

/**
 * Takes an async function *f* that does some requests with a number of string arguments,
 * which must form a unique combination,
 * and returns a similar function *f'* that caches the results based on the combination.
 * All other args given to *f* must not influence the result.
 *
 * By default, the tuple is hashed by simply joining the strings.
 */
export function cachify<A extends [], T>(
	f: (...args: A) => Promise<T>,
	options: LRU.Options<string, T | Promise<T> | Error> = {},
	hash: (...args: string[]) => string = joinN(f.length),
	keepError: (err: Error) => number = () => 0
) {
	const cache = new LRU<string, T | Promise<T> | Error>(options)

  return async function(...args: A) {
		const id = hash(...args)
		const cached = cache.get(id)
		if (cached) {
			if (cached instanceof Error) throw cached
			return cached
		}

		const promise = f(...args).catch(err => {
			const keepTime = keepError(err)
			if (keepTime) cache.set(id, err, keepTime)
			else cache.del(id)
			throw err
		})
		cache.set(id, promise)
		const fresh = await promise
		cache.set(id, fresh)
		return fresh
	}
}
