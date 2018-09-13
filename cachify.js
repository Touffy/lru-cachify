"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LRU = require("lru-cache");
exports.joinN = (n) => (...args) => args.slice(0, n).join('@');
/**
 * Takes an async function *f* that does some requests with a number of string arguments,
 * which must form a unique combination,
 * and returns a similar function *f'* that caches the results based on the combination.
 * All other args given to *f* must not influence the result.
 *
 * By default, the tuple is hashed by simply joining the strings.
 */
function cachify(f, options = {}, hash = exports.joinN(f.length), keepError = () => 0) {
    const cache = new LRU(options);
    return async function (...args) {
        const id = hash(...args);
        const cached = cache.get(id);
        if (cached) {
            if (cached instanceof Error)
                throw cached;
            return cached;
        }
        const promise = f(...args).catch(err => {
            const keepTime = keepError(err);
            if (keepTime)
                cache.set(id, err, keepTime);
            else
                cache.del(id);
            throw err;
        });
        cache.set(id, promise);
        const fresh = await promise;
        cache.set(id, fresh);
        return fresh;
    };
}
exports.cachify = cachify;
