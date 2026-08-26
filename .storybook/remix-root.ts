/**
 * Puente entre Storybook (renderer "html") y el runtime de componentes de
 * `remix/ui`, que no es React: cada componente es `(handle) => renderFn`,
 * montado con `createRoot(container).render(<Component {...props} />)`.
 */
import { createRoot, type RemixNode } from 'remix/ui'

let disposeCurrent: (() => void) | null = null

/**
 * Convierte un componente de `remix/ui` en una función `render(args)` que
 * Storybook puede usar como `render` de una historia.
 */
export function mountRemix<props extends object>(
  renderElement: (args: props) => RemixNode,
): (args: props) => HTMLElement {
  return (args: props) => {
    disposeCurrent?.()

    const container = document.createElement('div')
    const root = createRoot(container)
    root.render(renderElement(args))
    disposeCurrent = () => root.dispose()

    return container
  }
}
