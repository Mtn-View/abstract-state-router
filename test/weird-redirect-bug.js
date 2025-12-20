import { test } from 'node:test'
import assert from 'node:assert'
import getTestState from './helpers/test-state-factory.js'

test(`Weird redirect bug?`, async t => {
	let activated = false
		let resolves = 0

	function startTest(t) {
		const state = getTestState(t)
		const stateRouter = state.stateRouter

		let redirected = false

		// Our load resolve/load fn allows us to load an entity by its "id" or the "otherId" of a child entity
		// After we get the "id" using "otherId", we redirect to put "id" in the URL
		async function loadData(params) {
			// Mock loading "id" with "otherId"
			const id = await Promise.resolve(1)
			if (params.id != 1) {
				redirected = true
				// This should set id = 1 and keep otherId = 2
				console.log('redirecting - should be a third state change, but it never calls resolve', {
					id,
					otherId: params.otherId,
				})
				return Promise.reject({
					redirectTo: {
						name: null,
						params: {
							id,
							otherId: params.otherId,
						},
					},
				})
			}
			return params
		}

		stateRouter.addState({
			name: `state`,
			route: `/state/:id`,
			// querystringParameters: ['id'],
			defaultParameters: {
				id: null,
			},
			template: {},
			async resolve(data, params) {
				resolves++
				console.log('resolve start', params)

				return await loadData(params)
			},
			activate({ parameters, content }) {
				// Ignore initial activation
				if (parameters.otherId === 'init') {
					return
				}
				console.log('activate', parameters, 'redirected?', redirected)
				// After we redirect, these should be our parameters
				// However, in my testing, we never get here! It never activates after we redirect in the resolve!
				assert.ok(parameters.id == 1 && content.id == 1 && parameters.otherId == 2, 'State should activate once we set id = 1 and otherId = 2 by redirecting')
				if (parameters.id == 1 && parameters.otherId == 2) {
					activated = true
				}
			},
		})
		return state
	}

	await t.test(`test`, async t => {
		const state = startTest(t)
		const stateRouter = state.stateRouter

		await new Promise(resolve => {
			stateRouter.on('stateChangeEnd', (state, parameters) => {
				console.log('stateChangeEnd', parameters)
				if (parameters.id == 1 && parameters.otherId != 2) {
					console.log('second state change - this will reload the state because id is now null')
					stateRouter.go(`state`, { id: null, otherId: 2 })
				}

				if (parameters.id == 1 && parameters.otherId == 2) {
				assert.ok(resolves === 3, 'Should resolve three times!')

					assert.ok(activated, 'Not activated!')
					console.log('ending test')
					resolve()
				}
			})
			console.log('initial state change')
			stateRouter.go(`state`, { id: 1, otherId: 'init' })
		})
	})
})
