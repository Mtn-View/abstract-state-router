import { test } from 'node:test'
import assert from 'node:assert'
import getTestState from './helpers/test-state-factory.js'

test(`Weird redirect bug?`, async t => {
	function startTest(t) {
		const testState = {
			...getTestState(t),
			resolves: 0,
		}
		const stateRouter = testState.stateRouter

		stateRouter.addState({
			name: `state`,
			route: `/state/:id`,
			// Behavior doesn't change based on this bc id is a route parameter
			// querystringParameters: ['id'],
			defaultParameters: {
				id: null,
			},
			template: {},
			async resolve(_data, params) {
				testState.resolves++
				console.log('resolve start', testState.resolves, params)

				if (params.id != 1) {
					// This should set id = 1 and keep otherId = 2
					// In our actual app, id is fetched from the backend using otherId
					console.log('redirecting - should be a third state change, but it never calls resolve', {
						id: 1,
						otherId: params.otherId,
					})
					return Promise.reject({
						redirectTo: {
							name: null,
							params: {
								id: 1,
								otherId: params.otherId,
							},
						},
					})
				}

				return params
			},
			activate({ parameters }) {
				// Ignore initial activation
				if (parameters.otherId === 'init') {
					return
				}
				// After we redirect, these should be our parameters
				// However, in my testing, we never get here! It never activates (or re-runs resolve) after we redirect in the resolve!
				assert.ok(
					parameters.id == 1 && parameters.otherId == 2,
					'State should activate once we set id = 1 and otherId = 2 by redirecting'
				)
			},
		})
		return testState
	}

	await t.test(`id = 1`, async t => {
		const testState = startTest(t)
		const stateRouter = testState.stateRouter

		await new Promise(resolve => {
			stateRouter.on('stateChangeEnd', (_state, parameters) => {
				console.log('stateChangeEnd', parameters)
				if (parameters.id == 1 && parameters.otherId != 2) {
					console.log('second state change - this will reload the state because id is now null')
					stateRouter.go(`state`, { id: null, otherId: 2 })
				}

				if (parameters.id === '1' && parameters.otherId === '2') {
					assert.ok(testState.resolves === 3, 'Should resolve three times!')

					resolve()
				}
			})
			console.log('initial state change')
			stateRouter.go(`state`, { id: 1, otherId: 'init' })
		})
	})
})
