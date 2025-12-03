# Using ASR with Multiple Renderers

If your app needs to use multiple renderers(for example Ractive and Svelte), you may want to use ASR with multiple renderers *at the same time*. This can be especially useful during a period of transition between DOM libraries in your app. This is possible by making a wrapper renderer that uses the proper renderer based on a condition.

## Example Renderer

This is an example of a wrapper renderer that supports Ractive and Svelte 5.

> Note: This code assumes Ractive is a global in your project.

```js
import makeRactiveRenderer from 'ractive-state-router'
import makeSvelteStateRenderer from 'svelte-state-renderer'

function getContextRenderer(context) {
	if ('svelte' in context.template) {
		return 'svelte'
	}
	return 'ractive'
}

export default function makeRendererWrapper(ractiveOptions, svelteOptions) {
	const ractiveRenderer = makeRactiveRenderer(Ractive, ractiveOptions)
	const svelteRenderer = makeSvelteStateRenderer(svelteOptions)
	// Svelte 5+ HMR will remove domApi.renderer, so we have to track it separately
	const stateRenderers = new Map()

	return function theRendererRenderer(stateRouter) {
		const renderers = {
			ractive: ractiveRenderer(stateRouter),
			svelte: svelteRenderer(stateRouter),
		}

		async function render(context) {
			if (typeof context.element === 'string') {
				context.element = document.querySelector(context.element)
			}
			const renderer = getContextRenderer(context)
			stateRenderers.set(context.name, renderer)
			if (renderer === 'svelte' && !context.template.options) {
				context.template.options = {}
			}

			const domApi = await renderers[renderer].render(context)
			return domApi
		}

		function destroy(domApi, parentState) {
			const renderer = stateRenderers.get(parentState.name)
			if (!renderer) {
				throw new Error('renderer is not set - failed to destroy state')
			}
			stateRenderers.delete(parentState.name)
			return renderers[renderer].destroy(domApi, parentState)
		}

		function getChildElement(domApi, parentState) {
			const renderer = stateRenderers.get(parentState.name)
			if (!renderer) {
				throw new Error('renderer is not set - failed to get child element')
			}
			return renderers[renderer].getChildElement(domApi, parentState)
		}

		return {
			render,
			destroy,
			getChildElement,
		}
	}
}
```

## Example Usage

Here's how you'd use the above renderer wrapper in your app.

```js
import SvelteComponent from './SvelteComponent.svelte'

export default function (stateRouter) {
	stateRouter.addState({
		name: 'app.a',
		route: 'a',
		template: {
			svelte: true,
			component: SvelteComponent,
		},
		// ...
	})

	stateRouter.addState({
		name: 'app.b',
		route: 'b',
		template: {
			template: '<h1>This is a Ractive state!</h1>',
		},
		// ...
	})
}
```
