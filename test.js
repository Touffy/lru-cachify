const {cachify, joinN} = require('./cachify')

describe('The cachify utility', () => {
	const dummy = jest.fn((...args) => Promise.resolve(`processed:${args.join()}`))
	const gandalf = jest.fn(() => Promise.reject(new Error('You shall not PASS!')))

	beforeEach(() => {
		dummy.mockClear()
		gandalf.mockClear()
	})

	it('should call the function with the same arguments and return the same thing', () => {
		const cachedDummy = cachify(dummy, {max: 10}, id => id)
		const promise = cachedDummy('A')
		return promise.then(result => {
			expect(dummy.mock.calls[0]).toEqual(['A'])
			expect(result).toBe('processed:A')
			expect(dummy.mock.calls.length).toBe(1)
		})
	})

	it('should reject when the function throws', () => {
		const cachedDummy = cachify(gandalf, {max: 10}, id => id)
		const promise = cachedDummy('A')
		return promise.catch(() => {
			expect(gandalf.mock.calls.length).toBe(1)
			return expect(promise).rejects.toHaveProperty('message', 'You shall not PASS!')
		})
	})

	it('should not call the function when a call is already under way', async() => {
		const cachedDummy = cachify(dummy, {max: 10}, id => id)
		const promise1 = cachedDummy('A')
		const promise2 = cachedDummy('A')
		const promise3 = cachedDummy('B')
		const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3])
		expect(result1).toBe(result2)
		expect(result1).not.toBe(result3)
		expect(dummy.mock.calls.length).toBe(2)
	})

	it('should not call the function when the result is cached', async() => {
		const cachedDummy = cachify(dummy, {max: 10}, id => id)
		const result1 = await cachedDummy('A')
		const result2 = await cachedDummy('A')
		const result3 = await cachedDummy('B')
		expect(result1).toBe(result2)
		expect(result1).not.toBe(result3)
		expect(dummy.mock.calls.length).toBe(2)
	})

	it('should not cache error results by default', async() => {
		const cachedDummy = cachify(gandalf, {max: 10}, id => id)
		try {await cachedDummy('A')}
		catch (err) {expect(gandalf.mock.calls.length).toBe(1)}
		try {await cachedDummy('A')}
		catch (err) {expect(gandalf.mock.calls.length).toBe(2)}
	})

	it('should cache specified errors', async() => {
		function keepError(err) {return err.message === 'You shall not PASS!' ? 1000 : 0}
		const cachedDummy = cachify(gandalf, {max: 10}, id => id, keepError)
		let err1
		try {await cachedDummy('A')}
		catch (err) {
			err1 = err
			expect(gandalf.mock.calls.length).toBe(1)
		}
		try {await cachedDummy('A')}
		catch (err) {
			expect(gandalf.mock.calls.length).toBe(1)
			expect(err1).toBe(err)
		}
	})

	it('should use the hashing function to determine the cache ID', async() => {
		const cachedDummy1 = cachify(dummy, {max: 10}, id => id)
		await cachedDummy1('A', 'B', 'C')
		expect(await cachedDummy1('A', 'X', 'Y')).toBe('processed:A,B,C')
		expect(dummy.mock.calls.length).toBe(1)
		expect(await cachedDummy1('W', 'X', 'Y')).toBe('processed:W,X,Y')
		expect(dummy.mock.calls.length).toBe(2)

		dummy.mockClear()

		const cachedDummy2 = cachify(dummy, {max: 10}, joinN(2))
		await cachedDummy2('A', 'B', 'C')
		expect(await cachedDummy2('A', 'B', 'Y')).toBe('processed:A,B,C')
		expect(dummy.mock.calls.length).toBe(1)
		expect(await cachedDummy2('A', 'X', 'Y')).toBe('processed:A,X,Y')
		expect(dummy.mock.calls.length).toBe(2)
	})
})
