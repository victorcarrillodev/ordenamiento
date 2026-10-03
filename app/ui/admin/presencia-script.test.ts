// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `public/presencia.js` con un documento, una ventana, un reloj y unos
 * temporizadores propios de cada prueba: el script se evalúa como el cuerpo de una
 * función cuyos parámetros son `document`, `window`, `Date`, `setInterval`,
 * `clearInterval` y `fetch`, así que no comparte estado ni escuchas con las demás
 * pruebas. El reloj y los temporizadores los mueve la prueba a mano, y `fetch`
 * anota lo que se pide. Lo que se prueba es CUÁNDO avisa el navegador: solo cuando
 * la persona está, y nunca mientras no lo está.
 */
const SCRIPT = readFileSync(resolve(process.cwd(), 'public/presencia.js'), 'utf8')
const AVISO = '/ordena/admin/api/sesion/latido'

interface Opciones {
  /** ¿La pantalla es del panel (lleva la marca `data-latido`)? */
  panel?: boolean
  visible?: boolean
  /** Status con el que responde el servidor. */
  responde?: number
  /** `fetch` que falla, como sin red. */
  sinRed?: boolean
}

function montar(opciones: Opciones = {}) {
  const { panel = true, visible = true, responde = 204, sinRed = false } = opciones
  const doc = document.implementation.createHTMLDocument('panel')
  doc.body.innerHTML = `
    <div ${panel ? `class="admin" data-latido="${AVISO}"` : ''}>
      <p id="texto">Contenido</p>
      <iframe id="visor"></iframe>
    </div>`

  let reloj = 1_700_000_000_000
  let seVe = visible
  const ventana = new EventTarget()
  const temporizadores: Array<{ id: number; fn: () => void; cada: number; proximo: number }> = []
  let consecutivo = 1
  Object.defineProperty(doc, 'visibilityState', {
    configurable: true,
    get: () => (seVe ? 'visible' : 'hidden'),
  })

  const avisos: Array<{ en: number; url: string; init: RequestInit }> = []
  const falsoFetch = (url: string, init: RequestInit) => {
    avisos.push({ en: reloj, url, init })
    return sinRed ? Promise.reject(new Error('sin red')) : Promise.resolve({ status: responde })
  }
  const falsoSetInterval = (fn: () => void, cada: number) => {
    const id = consecutivo++
    temporizadores.push({ id, fn, cada, proximo: reloj + cada })
    return id
  }
  const falsoClearInterval = (id: number) => {
    const i = temporizadores.findIndex((t) => t.id === id)
    if (i >= 0) temporizadores.splice(i, 1)
  }

  new Function('document', 'window', 'Date', 'setInterval', 'clearInterval', 'fetch', SCRIPT)(
    doc,
    ventana,
    { now: () => reloj },
    falsoSetInterval,
    falsoClearInterval,
    falsoFetch,
  )

  const evento = (tipo: string) => doc.dispatchEvent(new Event(tipo, { bubbles: true }))
  const raton = (tipo: string, destino: Element, relacionado: Element | null = null) =>
    destino.dispatchEvent(new MouseEvent(tipo, { bubbles: true, relatedTarget: relacionado }))

  return {
    avisos,
    temporizadores,
    /** Mueve el reloj `ms`, disparando los temporizadores que venzan en el camino. */
    avanzar(ms: number) {
      const destino = reloj + ms
      for (;;) {
        const siguiente = temporizadores
          .filter((t) => t.proximo <= destino)
          .sort((a, b) => a.proximo - b.proximo)[0]
        if (!siguiente) break
        reloj = siguiente.proximo
        siguiente.proximo += siguiente.cada
        siguiente.fn()
      }
      reloj = destino
    },
    /** La persona hace algo. */
    toca: (tipo = 'pointerdown') => evento(tipo),
    visibilidad(valor: boolean) {
      seVe = valor
      evento('visibilitychange')
    },
    cierraPagina: () => ventana.dispatchEvent(new Event('pagehide')),
    sobreElVisor: () => raton('mouseover', doc.getElementById('visor')!),
    fueraDelVisor: () =>
      raton('mouseout', doc.getElementById('visor')!, doc.getElementById('texto')),
    sobreUnObjeto() {
      const objeto = doc.createElement('object')
      doc.body.append(objeto)
      raton('mouseover', objeto)
    },
    ahora: () => reloj,
  }
}

const S = 1000
const MIN = 60 * S

describe('presencia: cuándo avisa', () => {
  it('al cargar una pantalla del panel avisa de inmediato, con credenciales y sin cuerpo', () => {
    const p = montar()
    expect(p.avisos).toHaveLength(1)
    expect(p.avisos[0].url).toBe(AVISO)
    expect(p.avisos[0].init.method).toBe('POST')
    expect(p.avisos[0].init.credentials).toBe('same-origin')
    expect(p.avisos[0].init.keepalive).toBe(true)
    expect(p.avisos[0].init.body).toBeUndefined()
  })

  it('en una pantalla que no es del panel no avisa nunca, haga lo que haga', () => {
    const p = montar({ panel: false })
    p.toca()
    p.avanzar(5 * MIN)
    p.toca('keydown')
    p.avanzar(5 * MIN)
    expect(p.avisos).toHaveLength(0)
  })

  it('mientras la persona hace algo avisa cada 30 segundos, no más seguido', () => {
    const p = montar()
    for (let t = 0; t < 3 * MIN; t += 10 * S) {
      p.toca('keydown')
      p.avanzar(10 * S)
    }
    // Carga + uno cada ~30 s durante 3 minutos.
    expect(p.avisos.length).toBeGreaterThanOrEqual(6)
    expect(p.avisos.length).toBeLessThanOrEqual(8)
    for (let i = 1; i < p.avisos.length; i++) {
      expect(p.avisos[i].en - p.avisos[i - 1].en).toBeGreaterThanOrEqual(30 * S)
    }
  })

  it('si no hace nada deja de avisar a los 2 minutos: no hay tiempo que contar', () => {
    const p = montar()
    p.avanzar(10 * MIN)
    // Carga y los avisos de los primeros 2 minutos; nada después.
    expect(p.avisos.length).toBeGreaterThanOrEqual(3)
    expect(p.avisos.length).toBeLessThanOrEqual(5)
    expect(Math.max(...p.avisos.map((a) => a.en)) - p.avisos[0].en).toBeLessThan(2 * MIN)
  })

  it('al volver tras una pausa larga avisa de inmediato', () => {
    const p = montar()
    p.avanzar(10 * MIN)
    const antes = p.avisos.length
    p.toca('pointerdown')
    expect(p.avisos).toHaveLength(antes + 1)
  })

  it('un clic después de poco tiempo no dispara un aviso extra', () => {
    const p = montar()
    p.avanzar(10 * S)
    p.toca()
    p.avanzar(5 * S)
    p.toca('keydown')
    expect(p.avisos).toHaveLength(1)
  })

  it('el puntero y el desplazamiento no inundan: cientos de eventos, ningún aviso de más', () => {
    const p = montar()
    for (let i = 0; i < 500; i++) {
      p.toca('mousemove')
      p.toca('scroll')
    }
    expect(p.avisos).toHaveLength(1)
  })

  it('cada tipo de actividad cuenta como presencia', () => {
    for (const tipo of [
      'pointerdown',
      'keydown',
      'wheel',
      'touchstart',
      'scroll',
      'mousemove',
      'focusin',
    ]) {
      const p = montar()
      p.avanzar(10 * MIN) // se va
      const antes = p.avisos.length
      p.toca(tipo)
      expect(p.avisos.length, tipo).toBe(antes + 1)
    }
  })
})

describe('presencia: la pestaña a la vista', () => {
  it('con la pestaña oculta no avisa, aunque haya hecho algo hace un momento', () => {
    const p = montar()
    p.toca()
    p.visibilidad(false)
    const alOcultar = p.avisos.length
    p.avanzar(5 * MIN)
    expect(p.avisos).toHaveLength(alOcultar)
  })

  it('al ocultar la pestaña avisa una última vez, para no perder los últimos segundos', () => {
    const p = montar()
    p.avanzar(20 * S)
    p.toca('keydown')
    const antes = p.avisos.length
    p.visibilidad(false)
    expect(p.avisos).toHaveLength(antes + 1)
  })

  it('al ocultar la pestaña estando ausente no avisa: no hay nada que contar', () => {
    const p = montar()
    p.avanzar(10 * MIN)
    const antes = p.avisos.length
    p.visibilidad(false)
    expect(p.avisos).toHaveLength(antes)
  })

  it('al volver a ver la pestaña después de un rato avisa al instante', () => {
    const p = montar()
    p.visibilidad(false)
    p.avanzar(10 * MIN)
    const antes = p.avisos.length
    p.visibilidad(true)
    expect(p.avisos).toHaveLength(antes + 1)
  })

  it('una pantalla que se carga en una pestaña oculta no avisa hasta que se ve', () => {
    const p = montar({ visible: false })
    p.avanzar(5 * MIN)
    expect(p.avisos).toHaveLength(0)
    p.visibilidad(true)
    expect(p.avisos).toHaveLength(1)
  })

  it('al salir de la página avisa una última vez', () => {
    const p = montar()
    p.avanzar(20 * S)
    p.toca()
    const antes = p.avisos.length
    p.cierraPagina()
    expect(p.avisos).toHaveLength(antes + 1)
  })

  it('nunca dos avisos con menos de 3 segundos', () => {
    const p = montar()
    p.visibilidad(false)
    p.visibilidad(true)
    p.visibilidad(false)
    p.visibilidad(true)
    p.cierraPagina()
    expect(p.avisos).toHaveLength(1)
  })
})

describe('presencia: leer un documento sin tocar la página', () => {
  it('con el puntero sobre un visor sigue contando más allá de los 2 minutos', () => {
    const p = montar()
    p.sobreElVisor()
    p.avanzar(8 * MIN)
    expect(Math.max(...p.avisos.map((a) => a.en)) - p.avisos[0].en).toBeGreaterThan(5 * MIN)
  })

  it('pero con tope de 10 minutos: dejar el puntero ahí y marcharse no cuenta para siempre', () => {
    const p = montar()
    p.sobreElVisor()
    p.avanzar(30 * MIN)
    expect(Math.max(...p.avisos.map((a) => a.en)) - p.avisos[0].en).toBeLessThanOrEqual(10 * MIN)
  })

  it('al sacar el puntero del visor vuelve la regla normal de 2 minutos', () => {
    const p = montar()
    p.sobreElVisor()
    p.avanzar(1 * MIN)
    p.fueraDelVisor()
    const cuando = p.ahora()
    p.avanzar(10 * MIN)
    expect(Math.max(...p.avisos.map((a) => a.en)) - cuando).toBeLessThanOrEqual(2 * MIN)
  })

  it('un elemento <object> (el visor de PDF del panel) cuenta igual que un iframe', () => {
    const p = montar()
    p.sobreUnObjeto()
    p.avanzar(5 * MIN)
    expect(Math.max(...p.avisos.map((a) => a.en)) - p.avisos[0].en).toBeGreaterThan(3 * MIN)
  })
})

describe('presencia: cuando el servidor responde', () => {
  it('con 401 (la sesión terminó) deja de avisar para siempre', async () => {
    const p = montar({ responde: 401 })
    await Promise.resolve()
    await Promise.resolve()
    const antes = p.avisos.length
    p.toca()
    p.avanzar(5 * MIN)
    p.toca('keydown')
    expect(p.avisos).toHaveLength(antes)
    expect(p.temporizadores).toHaveLength(0)
  })

  it('con otros códigos de error sigue intentándolo', async () => {
    const p = montar({ responde: 503 })
    await Promise.resolve()
    await Promise.resolve()
    p.toca()
    p.avanzar(40 * S)
    expect(p.avisos.length).toBeGreaterThan(1)
  })

  it('sin red no se rompe nada y el siguiente aviso lo vuelve a intentar', async () => {
    const p = montar({ sinRed: true })
    await Promise.resolve()
    await Promise.resolve()
    p.toca()
    p.avanzar(40 * S)
    expect(p.avisos.length).toBeGreaterThan(1)
  })
})

describe('presencia: contrato con el servidor', () => {
  /** Constantes del script y del servicio, leídas de su código fuente. */
  const servicio = readFileSync(resolve(process.cwd(), 'backend/src/services/sesiones.ts'), 'utf8')
  const delScript = (nombre: string) =>
    Number(new RegExp(`var ${nombre} = (\\d+)`).exec(SCRIPT)?.[1])
  const delServicio = (nombre: string) =>
    Number(new RegExp(`export const ${nombre} = (\\d+)`).exec(servicio)?.[1])

  it('el servidor tolera al menos dos avisos perdidos antes de dar por ausente a la persona', () => {
    const latido = delScript('LATIDO_MS')
    expect(latido).toBe(30000)
    expect(delServicio('HUECO_MAXIMO_S') * 1000).toBeGreaterThanOrEqual(2.5 * latido)
    expect(delServicio('EN_LINEA_S') * 1000).toBeGreaterThanOrEqual(2.5 * latido)
  })

  it('«en línea» y «el tiempo corre» son la misma condición en el servidor', () => {
    expect(delServicio('EN_LINEA_S')).toBe(delServicio('HUECO_MAXIMO_S'))
  })

  it('la ruta del aviso es la que declara el panel', () => {
    const rutas = readFileSync(resolve(process.cwd(), 'app/routes.ts'), 'utf8')
    expect(rutas).toContain('latido: post(`${basePath}/admin/api/sesion/latido`)')
    expect(AVISO).toBe('/ordena/admin/api/sesion/latido')
  })
})
