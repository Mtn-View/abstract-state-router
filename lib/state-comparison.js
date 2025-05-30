import stateStringParser from './state-string-parser.js'

import combine from 'combine-arrays'
import pathToRegexp from 'path-to-regexp-with-reversible-keys'

export default function StateComparison(stateState) {
	const getPathParameters = pathParameters()

	const parametersChanged = args => parametersThatMatterWereChanged({ ...args, stateState, getPathParameters })

	return args => stateComparison({ ...args, parametersChanged })
}

function pathParameters() {
	const parameters = {}

	return path => {
		if (!path) {
			return []
		}

		if (!parameters[path]) {
			parameters[path] = pathToRegexp(path).keys.map(key => key.name)
		}

		return parameters[path]
	}
}

function parametersThatMatterWereChanged({ stateState, getPathParameters, stateName, fromParameters, toParameters }) {
	const state = stateState.get(stateName)
	const querystringParameters = state.querystringParameters || []
	const parameters = getPathParameters(state.route).concat(querystringParameters)

	return Array.isArray(parameters) && parameters.some(
		key => fromParameters[key] !== toParameters[key],
	)
}

function stateComparison({ parametersChanged, original, destination }) {
	const states = combine({
		start: stateStringParser(original.name),
		end: stateStringParser(destination.name),
	})

	return states.map(({ start, end }) => ({
		nameBefore: start,
		nameAfter: end,
		stateNameChanged: start !== end,
		stateParametersChanged: start === end && parametersChanged({
			stateName: start,
			fromParameters: original.parameters,
			toParameters: destination.parameters,
		}),
	}))
}
