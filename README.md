# LRU Cachify

This very small module provides a higher-order function `cachify` that adds cache behavior based on [lru cache](https://www.npmjs.com/package/lru-cache) to any async function *f* with string(ifiable) arguments. Calls to the resulting function *f'* = `cachify`(*f*) are identified by combining those arguments in an easily configurable way so that `cachify` knows when it should reuse cached results.

## Quick start

```sh
npm install lru-cachify
```

```javascript
import { cachify } from 'lru-cachify'

// the assumption is that, given the same id, this async function will return the same results forever (or some time at least)
const basicRequest = id => fetch(`someUrl?id=${id}`).then(res => res.json())

// this one too, except it will only fetch once, then reuse the cached result for ten minutes
const cachedRequest = cachify(basicRequest, {max: 100, maxAge: 6e5}, id => id)
```

## What does it do?

* tiny footprint (475o minified + lightweight lru-cache dependency)
* based on lru-cache: stores JavaScript values in memory, no need for serialization and no overhead (but small size)
* generic higher-order function with simple but powerful options, works with anything that returns a Promise
* works in case of simultaneous calls by caching the Promise until it resolves → no race condition!
* fine-grained caching of promise rejections
* TypeScript correctly infers that the result has the same type as the original function :)


## Cache configuration

The second argument to `cachify` is an [LRU cache options object](https://www.npmjs.com/package/lru-cache#options) passed directly to the LRU cosntructor. The most useful options are `max` (how many entires can be stored before the oldest ones get overwritten) and `maxAge` (how long an entry can be reused before refreshing).

`cachify` uses its third argument (the `hash` function) to determine a string key for each call to the resulting function *f'*. It will reuse previously stored results for *f* with that key instead of calling *f*. The `hash` function is called with all the arguments given to *f'*, and should return a string unique to the combination of all the arguments that determine the result of *f*. For example:

* If *f* takes only one ID-like argument, `hash` can just return that, like in the quick start example.
* If *f* takes more arguments but they don't impact the results (such as a configuration telling *f* which mirror to call for a particular service), `hash` should not use those extra arguments
* If *f* takes multiple arguments, the combination of which determines the result, you can use the built-in `joinN` function to create a suitable `hash` function. See below.

## Multiple arguments example

In this example, the function *l10n(string, lang, connection)* takes three arguments. The third argument doesn't change the results, it just tells *l10n* how to connect to a database. The first two arguments represent a string ID and a language. There is only one result for a given string ID in any language, so the combination of *string* and *lang* can be hashed into a suitable key.

Let's make a simple `hash` function that just joins two arguments into a string with "@" as a delimiter.

```javascript
const hash = (s1, s2) => [s1, s2].join('@')
```

Now we can create a cached version of *l10n*:

```javascript
const cachedL10n = cachify(l10n, {}, hash)
```

That's a very frequent use case, so lru-cachify comes with a `joinN` function. This is strictly equivalent to our `hash` function:

```javascript
import { joinN } from 'lru-cachify'
const hash = joinN(2)
```

So you could even more easily define your cached *l10n* function:
```javascript
const cachedL10n = cachify(l10n, {}, joinN(2))
```

If no `hash` argument is provided, `cachify` will default to `joinN(f.length)` (i.e. joining **all** the named arguments for *f*) so be careful when *f* has arguments irrelevant to the key like in this example.

## Non-string keys

This is JavaScript and there is nothing that really prevents you from returning arrays, other objects, or Symbols from the `hash` function (even mixing return types). The underlying LRU cache uses a `Map`, which accepts anything as a key.

Just beware that object keys are compared by reference so the hash function can't, for instance, just put *f'* arguments into an array and expect it to match another array containing the same arguments from a previous call to *f'* (the arrays would not be reference-equal).

Numbers (barring floating-point precision issues), BigInts and booleans should work fine as keys, though, since they are compared by value.

## Caching errors

By default, when `cachify` needs to call *f* to bring a fresh result for *f'* and the promise from *f* rejects, the cache for that key is cleared. So *f* will be called again until the promise resolves.

However, it can be useful to cache rejections, especially those errors whose semantics mean that it's unlikely to be fixed by retrying as-is (such as an HTTP error 404), or when you don't want to overload the infrastructure with immediate retries.

The optional fourth argument to `cachify` is a function that takes an Error and should return how long (in milliseconds) that Error is to be be cached (zero means it's not cached at all, `Infinity` is unlimited, and it is perfectly OK to return `false` instead of zero).

In this example, we cache 404 results forever and 401 results for a few seconds:

```javascript
const basicRequest = id => fetch(`someUrl?id=${id}`).then(res => {
  if (res.status >== 400) throw new HTTPError(res.status)
  return res.json()
})

const cachedRequest = cachify(basicRequest, {}, id => id, error => {
  switch(error.status) {
    case 404: return Infinity
    case 401: return 3000
    default: return 0
  }
})
```

## Does it work everywhere?

Like its dependency lru-cache, lru-cachify relies on es2015 features (`Map`s) that are difficult to polyfill, but nobody uses browsers or Node versions that don't have es2015 support anymore, right?

The TypeScript compiler is configured to output a commonJS module requiring es2017 support. Feel free to tweak that or just import the single-file source into your project and use your own transpiler configuration. `cachify` should easily transpile down to es2015.

## license

[MIT](https://tldrlegal.com/license/mit-license)
