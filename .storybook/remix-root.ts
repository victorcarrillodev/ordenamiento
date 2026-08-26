/**
 * Puente entre Storybook (renderer "@storybook/html-vite") y el runtime de
 * componentes de `remix/ui`.
 *
 * Remix 3 UI no utiliza React: cada componente es `(handle: Handle<Props>) => renderFn`,
 * y se monta en el DOM real mediante `createRoot(container).render(<Component {...props} />)`.
 */
import { createRoot, type RemixNode } from 'remix/ui'

const roots = new WeakMap<HTMLElement, { dispose: () => void }>()

/**
 * Convierte un componente de `remix/ui` en una función `render(args)` que
 * Storybook ejecuta para montar el componente en el canvas.
 */
export function mountRemix<Props extends object>(
  renderElement: (args: Props) => RemixNode,
): (args: Props) => HTMLElement {
  return (args: Props) => {
    const container = document.createElement('div')
    container.className = 'remix-storybook-container'

    const root = createRoot(container)
    root.render(renderElement(args))
    roots.set(container, root)

    return container
  }
}
