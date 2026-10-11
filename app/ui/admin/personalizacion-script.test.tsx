// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'remix/ui/server'

import { FormularioPanel } from '../../actions/admin/personalizacion-panel.tsx'
import { FormularioPortal } from '../../actions/admin/personalizacion-portal.tsx'
import {
  HistorialCambios,
  type AuditLogEntry,
} from '../../actions/admin/personalizacion-historial.tsx'
import { PALETAS_PORTAL } from '../../actions/admin/personalizacion-datos.ts'
import { isSafeImageUrl } from '../civic-horizon.ts'
import {
  capaDePortada,
  nivelDeContraste,
  normalizarHex,
  razonDeContraste,
} from '../../utils/color.ts'

/**
 * `public/personalizacion.js` sobre el HTML real del servidor: se monta el formulario tal
 * como lo dibuja `FormularioPortal` / `FormularioPanel` y se actúa sobre él como lo haría la
 * persona (escribir, elegir una paleta, mover una foto). Lo que se comprueba es lo que ve:
 * la maqueta, los avisos de contraste, el resumen de cambios y qué se puede enviar.
 *
 * jsdom no trae `DataTransfer`, `IntersectionObserver` ni `URL.createObjectURL`; el script
 * los usa solo si existen, y aquí se simula únicamente lo que cada prueba necesita.
 */
const SCRIPT = readFileSync(resolve(process.cwd(), 'public/personalizacion.js'), 'utf8')

const TEMA = {
  usuario: {
    colores: {
      primario: '#8c1d3d',
      acento: '#e0b84a',
      secundario: '#2d6a4f',
      navbarFondo: '#ffffff',
      navbarTexto: '#1a1d26',
      footerFondo: '#0f1117',
      footerTexto: '#ffffff',
      heroGradienteInicio: 'rgba(15,17,23,0.82)',
      heroGradienteCentro: 'rgba(140,29,61,0.7)',
      heroGradienteFin: 'rgba(15,17,23,0.75)',
    },
    imagenes: {
      logoNavbar: '/ordena/assets/img/logo/logo-200x60.webp',
      logoFooter: '/ordena/assets/img/logo/logo-200x60.webp',
      imagenEcologia: '/ordena/assets/img/vector/vector_1.webp',
      imagenPrograma: '/ordena/assets/img/vector/vector_2.webp',
      heroImagenes: ['/ordena/uno.jpg', '/ordena/dos.jpg'],
    },
    iconos: {
      cardPrograma: '🧭',
      cardProceso: '📊',
      cardCalendario: '📅',
      cardDocumentos: '📈',
    },
    textos: {},
  },
  panel: {
    sidebarFondo: '#ffffff',
    sidebarTexto: '#475066',
    topbarFondo: '#2e3440',
    topbarTexto: '#ffffff',
    colorAcento: '#2563eb',
    adminBg: '#f4f6fb',
    adminLogo: '/ordena/assets/img/logo/logo-200x60.webp',
    adminTitulo: 'ADMINISTRADOR\nBITÁCORA',
  },
}

/** Deja que el observador del DOM arranque el formulario que se acaba de montar. */
const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))

async function montar(tema: unknown = TEMA) {
  document.body.innerHTML = await renderToString(<FormularioPortal theme={tema as never} />)
  await esperar()
  return document.querySelector<HTMLFormElement>('form.pz')!
}

async function montarPanel() {
  document.body.innerHTML = await renderToString(
    <FormularioPanel theme={TEMA as never} usuario="Ana López" />,
  )
  await esperar()
  return document.querySelector<HTMLFormElement>('form.pz')!
}

function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  el.value = valor
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function elegirColor(form: HTMLFormElement, clave: string, valor: string) {
  escribir(form.querySelector<HTMLInputElement>(`[data-pz-color="${clave}"]`)!, valor)
}

const color = (form: HTMLFormElement, clave: string) =>
  form.querySelector<HTMLInputElement>(`[data-pz-color="${clave}"]`)!

const variable = (form: HTMLFormElement, nombre: string) =>
  form.querySelector<HTMLElement>('[data-pz-vista]')!.style.getPropertyValue(nombre)

const resumen = (form: HTMLFormElement) =>
  [...form.querySelectorAll('[data-pz-resumen] li:not([data-pz-resumen-vacio])')].map((li) =>
    (li.textContent ?? '').replace(/\s+/g, ' ').trim(),
  )

function clic(el: Element) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

const confirmar = vi.fn(() => true)

beforeAll(() => {
  window.confirm = confirmar
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  new Function(SCRIPT)()
})

afterEach(() => {
  document.body.innerHTML = ''
  confirmar.mockReset()
  confirmar.mockReturnValue(true)
})

describe('al abrir la pantalla', () => {
  it('arranca el formulario sin cambios, aunque llegue después de cargar el script', async () => {
    const form = await montar()
    expect(form.getAttribute('data-pz-listo')).toBe('1')
    expect(form.querySelector('[data-pz-conteo]')!.textContent).toBe('0')
    expect(form.querySelector<HTMLElement>('[data-pz-barra]')!.hidden).toBe(true)
    expect(form.querySelector('[data-pz-estado-vista]')!.textContent).toBe('Igual que lo publicado')
    expect(resumen(form)).toEqual([])
    expect(form.querySelector<HTMLButtonElement>('[data-pz-guardar]')!.disabled).toBe(true)
  })

  it('marca la paleta que coincide con los colores guardados', async () => {
    const form = await montar()
    const pulsadas = [...form.querySelectorAll('[data-pz-paleta]')].map((b) =>
      b.getAttribute('aria-pressed'),
    )
    expect(pulsadas).toEqual(['true', 'false', 'false', 'false', 'false', 'false'])
    expect(form.querySelector<HTMLElement>('[data-pz-paleta-nota]')!.hidden).toBe(true)
  })

  it('con colores que no son de ninguna paleta lo dice', async () => {
    const tema = structuredClone(TEMA)
    tema.usuario.colores.primario = '#123456'
    const form = await montar(tema)
    const pulsadas = [...form.querySelectorAll('[data-pz-paleta]')].map((b) =>
      b.getAttribute('aria-pressed'),
    )
    expect(pulsadas.every((p) => p === 'false')).toBe(true)
    expect(form.querySelector<HTMLElement>('[data-pz-paleta-nota]')!.hidden).toBe(false)
  })

  it('un segundo formulario que llega al navegar también se arranca', async () => {
    await montar()
    document.body.innerHTML = await renderToString(
      <FormularioPanel theme={TEMA as never} usuario="Ana" />,
    )
    await esperar()
    expect(document.querySelector('form.pz')!.getAttribute('data-pz-listo')).toBe('1')
  })
})

describe('colores y vista previa', () => {
  it('elegir un color repinta la maqueta, el fondo de las imágenes y lo anota como cambio', async () => {
    const form = await montar()
    elegirColor(form, 'navbarFondo', '#112233')
    expect(variable(form, '--v-menu-fondo')).toBe('#112233')
    expect(form.style.getPropertyValue('--pz-fondo-menu')).toBe('#112233')
    expect(resumen(form)).toEqual(['Fondo del menú #ffffff → #112233'])
    expect(form.querySelector('[data-pz-conteo]')!.textContent).toBe('1')
    expect(form.querySelector<HTMLElement>('[data-pz-barra]')!.hidden).toBe(false)
    expect(form.querySelector('[data-pz-barra-texto]')!.textContent).toBe('1 cambio sin guardar')
    expect(form.querySelector('[data-pz-estado-vista]')!.textContent).toBe(
      'Con cambios sin guardar',
    )
  })

  it('el texto hexadecimal sigue al selector y el selector al texto', async () => {
    const form = await montar()
    const picker = color(form, 'primario')
    const texto = form.querySelector<HTMLInputElement>(`[data-pz-hex="${picker.id}"]`)!
    elegirColor(form, 'primario', '#1b4332')
    expect(texto.value).toBe('#1b4332')

    escribir(texto, '#abc')
    expect(picker.value).toBe('#aabbcc')
    expect(variable(form, '--v-primario')).toBe('#aabbcc')
  })

  it('un código inválido avisa y no toca el color; al salir del campo vuelve al vigente', async () => {
    const form = await montar()
    const picker = color(form, 'acento')
    const texto = form.querySelector<HTMLInputElement>(`[data-pz-hex="${picker.id}"]`)!
    const campo = texto.closest('.pz-color')!

    escribir(texto, '#zzz')
    expect(campo.classList.contains('pz-color--invalido')).toBe(true)
    expect(campo.querySelector<HTMLElement>('[data-pz-hex-error]')!.hidden).toBe(false)
    expect(picker.value).toBe('#e0b84a')
    expect(resumen(form)).toEqual([])

    texto.dispatchEvent(new Event('change', { bubbles: true }))
    expect(texto.value).toBe('#e0b84a')
    expect(campo.classList.contains('pz-color--invalido')).toBe(false)
    expect(campo.querySelector<HTMLElement>('[data-pz-hex-error]')!.hidden).toBe(true)
  })

  it('«deshacer» devuelve el color guardado y oculta su botón', async () => {
    const form = await montar()
    const picker = color(form, 'secundario')
    const campo = picker.closest('.pz-color')!
    const deshacer = campo.querySelector<HTMLButtonElement>('[data-pz-deshacer]')!
    expect(deshacer.hidden).toBe(true)

    elegirColor(form, 'secundario', '#ff0000')
    expect(deshacer.hidden).toBe(false)
    expect(campo.classList.contains('pz-color--cambiado')).toBe(true)

    clic(deshacer)
    expect(picker.value).toBe('#2d6a4f')
    expect(deshacer.hidden).toBe(true)
    expect(campo.classList.contains('pz-color--cambiado')).toBe(false)
    expect(resumen(form)).toEqual([])
  })

  it('aplicar una paleta cambia solo los colores que son distintos y la marca «en uso»', async () => {
    const form = await montar()
    const bosque = [...form.querySelectorAll<HTMLElement>('[data-pz-paleta]')][1]
    clic(bosque)
    const esperado = PALETAS_PORTAL[1].colores
    expect(color(form, 'primario').value).toBe(esperado.primario)
    expect(color(form, 'footerTexto').value).toBe(esperado.footerTexto)
    expect(bosque.getAttribute('aria-pressed')).toBe('true')
    // El secundario es igual en las dos paletas: no es un cambio.
    expect(resumen(form).some((r) => r.startsWith('Color secundario'))).toBe(false)
    expect(resumen(form).some((r) => r.startsWith('Color primario'))).toBe(true)
  })

  it('al cambiar una paleta a mano ya no está «en uso»', async () => {
    const form = await montar()
    elegirColor(form, 'primario', '#123456')
    expect(form.querySelector('[data-pz-paleta]')!.getAttribute('aria-pressed')).toBe('false')
    expect(form.querySelector<HTMLElement>('[data-pz-paleta-nota]')!.hidden).toBe(false)
  })

  it('el tinte de la portada sigue al color primario', async () => {
    const form = await montar()
    elegirColor(form, 'primario', '#1b4332')
    expect(variable(form, '--v-capa-centro')).toBe(capaDePortada('#1b4332', 100).centro)
    expect(variable(form, '--v-capa-inicio')).toBe('rgba(15,17,23,0.82)')
  })

  it('la capa se gradúa con su control y se anota con su valor', async () => {
    const form = await montar()
    const control = form.querySelector<HTMLInputElement>('[data-pz-capa]')!
    escribir(control, '50')
    expect(form.querySelector('[data-pz-capa-valor]')!.textContent).toBe('50 %')
    expect(variable(form, '--v-capa-inicio')).toBe(capaDePortada('#8c1d3d', 50).inicio)
    expect(resumen(form)).toEqual(['Capa de color sobre las fotos 100 % → 50 %'])
  })
})

describe('contraste', () => {
  const nivelDe = (form: HTMLFormElement, id: string) =>
    form.querySelector(`[data-pz-contraste][data-clave-fondo="${id}"]`)!

  it('al arrancar los avisos son los mismos que dibujó el servidor', async () => {
    const form = await montar()
    const menu = nivelDe(form, 'navbarFondo')
    const razon = razonDeContraste('#1a1d26', '#ffffff') as number
    expect(menu.classList.contains(`pz-contraste--${nivelDeContraste(razon)}`)).toBe(true)
    expect(menu.querySelector('[data-pz-razon]')!.textContent).toContain(
      `${(Math.round(razon * 10) / 10).toFixed(1)}:1`,
    )
  })

  it('un texto del color de su fondo pasa a «insuficiente», y al corregirlo vuelve', async () => {
    const form = await montar()
    const menu = nivelDe(form, 'navbarFondo')
    elegirColor(form, 'navbarTexto', '#fefefe')
    expect(menu.classList.contains('pz-contraste--bajo')).toBe(true)
    expect(menu.querySelector('[data-pz-razon]')!.textContent).toContain('Insuficiente')

    elegirColor(form, 'navbarTexto', '#000000')
    expect(menu.classList.contains('pz-contraste--bajo')).toBe(false)
    expect(menu.classList.contains('pz-contraste--aaa')).toBe(true)
    expect(menu.querySelector('[data-pz-razon]')!.textContent).toContain('Excelente')
  })

  it('el botón del menú se mide siempre contra el blanco', async () => {
    const form = await montar()
    const boton = nivelDe(form, 'primario')
    elegirColor(form, 'primario', '#ffff00')
    expect(boton.classList.contains('pz-contraste--bajo')).toBe(true)
    elegirColor(form, 'primario', '#000080')
    expect(boton.classList.contains('pz-contraste--aaa')).toBe(true)
  })

  it('la muestra «Aa» se pinta con los colores que se están midiendo', async () => {
    const form = await montar()
    elegirColor(form, 'footerFondo', '#202020')
    const muestra = nivelDe(form, 'footerFondo').querySelector<HTMLElement>(
      '.pz-contraste__muestra',
    )!
    expect(muestra.style.background).toContain('rgb(32, 32, 32)')
  })
})

describe('fotos de la portada', () => {
  const filas = (form: HTMLFormElement) =>
    [...form.querySelectorAll<HTMLInputElement>('[data-pz-url-foto]')].map((i) => i.value)

  it('parte de las fotos guardadas, en su orden', async () => {
    const form = await montar()
    expect(filas(form)).toEqual(['/ordena/uno.jpg', '/ordena/dos.jpg'])
    expect(form.querySelector('[data-pz-fotos-texto]')!.textContent).toContain('2 fotos')
    expect(variable(form, '--v-foto')).toBe('url("/ordena/uno.jpg")')
  })

  it('subir una foto en el orden cambia cuál es la primera de la maqueta', async () => {
    const form = await montar()
    const segunda = form.querySelectorAll<HTMLElement>('[data-pz-foto]')[1]
    clic(segunda.querySelector('[data-pz-foto-accion="subir"]')!)
    expect(filas(form)).toEqual(['/ordena/dos.jpg', '/ordena/uno.jpg'])
    expect(variable(form, '--v-foto')).toBe('url("/ordena/dos.jpg")')
    expect(form.querySelector('[data-pz-foto-n]')!.textContent).toBe('1')
    expect(resumen(form)).toEqual(['Fotos de la portada 2 fotos → nuevo orden'])
  })

  it('bajar la primera es lo mismo que subir la segunda', async () => {
    const form = await montar()
    const primera = form.querySelector<HTMLElement>('[data-pz-foto]')!
    clic(primera.querySelector('[data-pz-foto-accion="bajar"]')!)
    expect(filas(form)).toEqual(['/ordena/dos.jpg', '/ordena/uno.jpg'])
  })

  it('agregar una foto añade una fila vacía con el foco y cuenta como foto nueva solo si tiene dirección', async () => {
    const form = await montar()
    clic(form.querySelector('[data-pz-agregar-foto]')!)
    expect(filas(form)).toHaveLength(3)
    // Una fila vacía no cambia lo que se guarda.
    expect(resumen(form)).toEqual([])

    const nueva = [...form.querySelectorAll<HTMLInputElement>('[data-pz-url-foto]')][2]
    escribir(nueva, '/ordena/tres.jpg')
    expect(resumen(form)).toEqual(['Fotos de la portada 2 fotos → 1 foto nueva'])
    expect(form.querySelector('[data-pz-fotos-texto]')!.textContent).toContain('3 fotos')
  })

  it('quitar una foto la saca de la lista y se anota', async () => {
    const form = await montar()
    clic(
      form.querySelectorAll('[data-pz-foto]')[1].querySelector('[data-pz-foto-accion="quitar"]')!,
    )
    expect(filas(form)).toEqual(['/ordena/uno.jpg'])
    expect(form.querySelector('[data-pz-fotos-texto]')!.textContent).toContain('1 foto')
    expect(resumen(form)).toEqual(['Fotos de la portada 2 fotos → 1 foto quitada'])
  })

  it('no deja quitar la última foto: el carrusel nunca se queda en cero', async () => {
    const tema = structuredClone(TEMA)
    tema.usuario.imagenes.heroImagenes = ['/ordena/uno.jpg']
    const form = await montar(tema)
    clic(form.querySelector('[data-pz-foto-accion="quitar"]')!)
    expect(filas(form)).toEqual(['/ordena/uno.jpg'])
  })

  it('escribir una dirección actualiza la miniatura; una dirección insegura no se pinta', async () => {
    const form = await montar()
    const campo = form.querySelector<HTMLInputElement>('[data-pz-url-foto]')!
    const fila = campo.closest('[data-pz-foto]')!
    escribir(campo, '/ordena/otra.jpg')
    expect(fila.querySelector('img')!.getAttribute('src')).toBe('/ordena/otra.jpg')
    escribir(campo, 'http://inseguro.test/x.jpg')
    // Sin dirección válida no queda una <img> sin `src`.
    expect(fila.querySelector('img')).toBeNull()
    escribir(campo, '/ordena/otra-vez.jpg')
    expect(fila.querySelector('img')!.getAttribute('src')).toBe('/ordena/otra-vez.jpg')
  })

  it('los puntos de la maqueta cuentan las fotos y desaparecen con una sola', async () => {
    const form = await montar()
    const puntos = form.querySelector<HTMLElement>('[data-pz-v-puntos]')!
    expect(puntos.children).toHaveLength(2)
    expect(puntos.hidden).toBe(false)
    clic(
      form.querySelectorAll('[data-pz-foto]')[1].querySelector('[data-pz-foto-accion="quitar"]')!,
    )
    expect(puntos.hidden).toBe(true)
  })
})

describe('imágenes sueltas', () => {
  const tarjeta = (form: HTMLFormElement, nombre: string) =>
    form
      .querySelector<HTMLInputElement>(`[name="${nombre}"]`)!
      .closest<HTMLElement>('[data-pz-imagen]')!

  it('escribir una ruta del sitio cambia la vista previa y la maqueta', async () => {
    const form = await montar()
    const campo = form.querySelector<HTMLInputElement>('[name="logo_navbar"]')!
    escribir(campo, '/ordena/marca/nuevo-logo.png')
    expect(
      tarjeta(form, 'logo_navbar').querySelector('[data-pz-imagen-vista]')!.getAttribute('src'),
    ).toBe('/ordena/marca/nuevo-logo.png')
    expect(form.querySelector('[data-pz-v-logo-menu]')!.getAttribute('src')).toBe(
      '/ordena/marca/nuevo-logo.png',
    )
    expect(resumen(form)[0]).toContain('Logotipo del menú superior')
  })

  it.each([
    ['http://sitio.test/a.png', 'https://'],
    ['sitio.test/a.png', 'ruta del sitio'],
    ['/a b.png', 'espacios'],
    ['/a".png', 'comillas'],
  ])('«%s» no se acepta y explica por qué', async (direccion, pista) => {
    const form = await montar()
    const campo = form.querySelector<HTMLInputElement>('[name="logo_footer"]')!
    escribir(campo, direccion)
    const aviso = tarjeta(form, 'logo_footer').querySelector<HTMLElement>('[data-pz-imagen-aviso]')!
    expect(aviso.hidden).toBe(false)
    expect(aviso.textContent).toContain(pista)
    expect(campo.getAttribute('aria-invalid')).toBe('true')
  })

  it('una dirección válida limpia el aviso', async () => {
    const form = await montar()
    const campo = form.querySelector<HTMLInputElement>('[name="logo_footer"]')!
    escribir(campo, 'http://x.test/a.png')
    escribir(campo, 'https://x.test/a.png')
    const aviso = tarjeta(form, 'logo_footer').querySelector<HTMLElement>('[data-pz-imagen-aviso]')!
    expect(aviso.hidden).toBe(true)
    expect(campo.getAttribute('aria-invalid')).toBe('false')
  })

  it('«Quitar» vacía la dirección y la vista previa vuelve a la imagen del proyecto', async () => {
    const form = await montar()
    const campo = form.querySelector<HTMLInputElement>('[name="imagen_ecologia"]')!
    const t = tarjeta(form, 'imagen_ecologia')
    escribir(campo, '/ordena/marca/otra.png')
    clic(t.querySelector('[data-pz-quitar-imagen]')!)
    expect(campo.value).toBe('')
    expect(t.querySelector('[data-pz-imagen-vista]')!.getAttribute('src')).toBe(
      campo.getAttribute('data-defecto'),
    )
    expect(form.querySelector('[data-pz-v-ecologia]')!.getAttribute('src')).toBe(
      campo.getAttribute('data-defecto'),
    )
  })

  it('elige la misma regla que el servidor para aceptar una dirección', async () => {
    await montar()
    const direccion = (
      window as unknown as { __pz: { direccionDeImagen(v: string): { ok: boolean } } }
    ).__pz.direccionDeImagen
    for (const v of [
      '/a.png',
      '/ordena/marca/a.png',
      'https://a.test/x.png',
      'http://a.test/x.png',
      'a.png',
      '/a b.png',
      '/a(1).png',
      '/a"b.png',
      "/a'b.png",
      '/a\\b.png',
      '//host/a.png',
      '',
    ]) {
      const servidor = v === '' ? true : isSafeImageUrl(v)
      expect(direccion(v).ok, JSON.stringify(v)).toBe(servidor)
    }
  })
})

describe('íconos', () => {
  const campo = (form: HTMLFormElement, n: number) =>
    form.querySelector<HTMLInputElement>(`[name="ico_card${n}"]`)!

  it('un emoji sugerido se pone en el campo, en la tarjeta y en la maqueta', async () => {
    const form = await montar()
    const tarjeta = campo(form, 1).closest<HTMLElement>('[data-pz-icono]')!
    const arbol = [...tarjeta.querySelectorAll<HTMLElement>('[data-pz-emoji]')].find(
      (b) => b.getAttribute('data-pz-emoji') === '🌳',
    )!
    clic(arbol)
    expect(campo(form, 1).value).toBe('🌳')
    expect(tarjeta.querySelector('[data-pz-icono-actual]')!.textContent).toBe('🌳')
    expect(form.querySelector('[data-pz-v-icono="1"]')!.textContent).toBe('🌳')
    expect(arbol.getAttribute('aria-pressed')).toBe('true')
    expect(resumen(form)).toEqual(['Ícono de «Conoce las fases» 🧭 → 🌳'])
  })

  it('escribir un emoji propio también se refleja, y vaciar el campo deja el guardado', async () => {
    const form = await montar()
    escribir(campo(form, 2), '🚀')
    expect(form.querySelector('[data-pz-v-icono="2"]')!.textContent).toBe('🚀')
    escribir(campo(form, 2), '')
    expect(form.querySelector('[data-pz-v-icono="2"]')!.textContent).toBe('📊')
  })
})

describe('descartar y enviar', () => {
  it('descartar pide confirmación y devuelve todo a lo guardado, fotos incluidas', async () => {
    const form = await montar()
    elegirColor(form, 'primario', '#123456')
    clic(
      form.querySelectorAll('[data-pz-foto]')[1].querySelector('[data-pz-foto-accion="quitar"]')!,
    )
    clic(form.querySelector('[data-pz-agregar-foto]')!)
    expect(resumen(form).length).toBeGreaterThan(0)

    clic(form.querySelector('[data-pz-descartar]')!)
    expect(confirmar).toHaveBeenCalledTimes(1)
    expect(color(form, 'primario').value).toBe('#8c1d3d')
    expect(
      [...form.querySelectorAll<HTMLInputElement>('[data-pz-url-foto]')].map((i) => i.value),
    ).toEqual(['/ordena/uno.jpg', '/ordena/dos.jpg'])
    expect(resumen(form)).toEqual([])
    expect(form.querySelector<HTMLElement>('[data-pz-barra]')!.hidden).toBe(true)
  })

  it('si se responde que no al descartar, no se pierde nada', async () => {
    const form = await montar()
    elegirColor(form, 'primario', '#123456')
    confirmar.mockReturnValue(false)
    clic(form.querySelector('[data-pz-descartar]')!)
    expect(color(form, 'primario').value).toBe('#123456')
  })

  it('sin cambios, descartar y guardar están desactivados y enviar no hace nada', async () => {
    const form = await montar()
    for (const b of form.querySelectorAll<HTMLButtonElement>('[data-pz-descartar]')) {
      expect(b.disabled).toBe(true)
    }
    const evento = new Event('submit', { bubbles: true, cancelable: true })
    form.dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(true)
  })

  it('con cambios se puede enviar', async () => {
    const form = await montar()
    elegirColor(form, 'primario', '#123456')
    expect(form.querySelector<HTMLButtonElement>('[data-pz-guardar]')!.disabled).toBe(false)
    const evento = new Event('submit', { bubbles: true, cancelable: true })
    form.dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(false)
  })

  it('el formulario manda todos los campos que el controlador lee', async () => {
    const form = await montar()
    elegirColor(form, 'primario', '#123456')
    const datos = new FormData(form)
    for (const nombre of [
      'section',
      'tab',
      'color_primario',
      'color_acento',
      'color_secundario',
      'color_navbar_fondo',
      'color_navbar_texto',
      'color_footer_fondo',
      'color_footer_texto',
      'hero_capa',
      'logo_navbar',
      'logo_footer',
      'imagen_ecologia',
      'imagen_programa',
      'ico_card1',
      'ico_card4',
    ]) {
      expect(datos.has(nombre), nombre).toBe(true)
    }
    expect(datos.get('color_primario')).toBe('#123456')
    expect(datos.getAll('hero_imagenes[]')).toEqual(['/ordena/uno.jpg', '/ordena/dos.jpg'])
  })
})

describe('salir con cambios sin guardar', () => {
  function enlace(href: string, destino?: string) {
    const a = document.createElement('a')
    a.href = href
    if (destino) a.target = destino
    document.body.appendChild(a)
    return a
  }

  it('un enlace de otra pantalla pide confirmación; si se cancela, no navega', async () => {
    const form = await montar()
    elegirColor(form, 'primario', '#123456')
    confirmar.mockReturnValue(false)
    const a = enlace('/ordena/admin/estadisticas')
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true })
    a.dispatchEvent(evento)
    expect(confirmar).toHaveBeenCalledTimes(1)
    expect(evento.defaultPrevented).toBe(true)
  })

  it('si se confirma, el enlace sigue su camino', async () => {
    const form = await montar()
    elegirColor(form, 'primario', '#123456')
    const a = enlace('/ordena/admin/estadisticas')
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true })
    a.dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(false)
  })

  it('sin cambios no pregunta, y tampoco con anclas, otra pestaña ni «Ir a guardar»', async () => {
    const form = await montar()
    const a = enlace('/ordena/admin/estadisticas')
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(confirmar).not.toHaveBeenCalled()

    elegirColor(form, 'primario', '#123456')
    enlace('#pz-guardar').dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    )
    enlace('/ordena/', '_blank').dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    )
    form
      .querySelector('[data-pz-ir-guardar]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(confirmar).not.toHaveBeenCalled()
  })

  it('al descartar o guardar ya no pregunta', async () => {
    const form = await montar()
    elegirColor(form, 'primario', '#123456')
    clic(form.querySelector('[data-pz-descartar]')!)
    confirmar.mockClear()
    enlace('/ordena/admin/estadisticas').dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    )
    expect(confirmar).not.toHaveBeenCalled()
  })
})

describe('motivo del cambio', () => {
  it('una sugerencia rellena el campo del motivo', async () => {
    const form = await montar()
    const sugerencia = form.querySelector<HTMLElement>('[data-pz-motivo-sugerido]')!
    clic(sugerencia)
    expect(form.querySelector<HTMLInputElement>('#motivo')!.value).toBe(
      sugerencia.getAttribute('data-pz-motivo-sugerido'),
    )
  })

  it('resalta la sugerencia que corresponde a lo que se cambió', async () => {
    const form = await montar()
    const deColores = form.querySelector('[data-pz-motivo-de="colores"]')!
    const deIconos = form.querySelector('[data-pz-motivo-de="iconos"]')!
    expect(deColores.classList.contains('pz-sugerencia--sugerida')).toBe(false)
    elegirColor(form, 'acento', '#00ff00')
    expect(deColores.classList.contains('pz-sugerencia--sugerida')).toBe(true)
    expect(deIconos.classList.contains('pz-sugerencia--sugerida')).toBe(false)
  })

  it('las sugerencias funcionan en cualquier formulario con un campo «motivo» (la pantalla de textos)', async () => {
    document.body.innerHTML = `<form><input name="motivo"><button type="button" data-pz-motivo-sugerido="Corrección de redacción">x</button></form>`
    clic(document.querySelector('button')!)
    expect(document.querySelector<HTMLInputElement>('[name="motivo"]')!.value).toBe(
      'Corrección de redacción',
    )
  })
})

describe('vista previa', () => {
  it('cambiar de dispositivo marca la maqueta y el botón', async () => {
    const form = await montar()
    const movil = form.querySelector<HTMLElement>('[data-pz-dispositivo="movil"]')!
    clic(movil)
    expect(form.querySelector('[data-pz-vista]')!.getAttribute('data-dispositivo')).toBe('movil')
    expect(movil.getAttribute('aria-pressed')).toBe('true')
    expect(
      form.querySelector('[data-pz-dispositivo="escritorio"]')!.getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('un clic en la maqueta abre y destaca la sección que cambia esa parte', async () => {
    const form = await montar()
    const seccion = document.getElementById('pz-fotos') as HTMLDetailsElement
    seccion.open = false
    clic(form.querySelector('.pz-v-portada')!)
    expect(seccion.open).toBe(true)
    expect(seccion.classList.contains('pz-seccion--destello')).toBe(true)
  })

  it('al enfocar un campo se ilumina en la maqueta lo que pinta', async () => {
    const form = await montar()
    const campo = color(form, 'footerFondo')
    campo.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(form.querySelector('.pz-v-pie')!.classList.contains('pz-resalte')).toBe(true)
    campo.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    expect(form.querySelector('.pz-v-pie')!.classList.contains('pz-resalte')).toBe(false)
  })
})

describe('panel administrativo', () => {
  it('los colores del panel repintan la maqueta del panel', async () => {
    const form = await montarPanel()
    elegirColor(form, 'topbarFondo', '#8c1d3d')
    elegirColor(form, 'sidebarFondo', '#101010')
    expect(variable(form, '--v-barra-fondo')).toBe('#8c1d3d')
    expect(variable(form, '--v-lateral-fondo')).toBe('#101010')
    expect(form.style.getPropertyValue('--pz-fondo-lateral')).toBe('#101010')
  })

  it('el título y su contador se reflejan al escribir', async () => {
    const form = await montarPanel()
    const titulo = form.querySelector<HTMLTextAreaElement>('[data-pz-titulo-panel]')!
    escribir(titulo, 'Panel\nde prueba')
    expect(form.querySelector('[data-pz-vp-titulo]')!.textContent).toBe('Panel\nde prueba')
    expect(form.querySelector('[data-pz-contador="panel_admin_titulo"]')!.textContent).toBe('15')
    expect(resumen(form)[0]).toContain('Título del menú lateral')
  })

  it('el texto de la barra se mide contra su fondo', async () => {
    const form = await montarPanel()
    const barra = form.querySelector('[data-pz-contraste][data-clave-fondo="topbarFondo"]')!
    elegirColor(form, 'topbarTexto', '#2e3440')
    expect(barra.classList.contains('pz-contraste--bajo')).toBe(true)
  })

  it('una paleta del panel se aplica con sus seis colores', async () => {
    const form = await montarPanel()
    const grafito = [...form.querySelectorAll<HTMLElement>('[data-pz-paleta]')][1]
    clic(grafito)
    expect(color(form, 'sidebarFondo').value).toBe('#1f2937')
    expect(color(form, 'colorAcento').value).toBe('#0284c7')
    expect(grafito.getAttribute('aria-pressed')).toBe('true')
  })
})

describe('buscador del historial', () => {
  const registros: AuditLogEntry[] = [
    {
      id: 'a',
      user_name: 'Ana López',
      user_email: 'ana@x.test',
      motivo: 'Cambio de logotipo',
      section: 'usuario',
      created_at: '2026-10-09T18:00:00Z',
    },
    {
      id: 'b',
      user_name: 'Luis Pérez',
      user_email: 'luis@x.test',
      motivo: 'Colores del panel',
      section: 'panel',
      created_at: '2026-10-08T18:00:00Z',
    },
    {
      id: 'c',
      user_name: 'Ana López',
      user_email: 'ana@x.test',
      motivo: 'Restauración',
      section: 'general',
      created_at: '2026-10-07T18:00:00Z',
    },
  ]

  async function montarHistorial() {
    document.body.innerHTML = await renderToString(<HistorialCambios registros={registros} />)
    return document.querySelector<HTMLInputElement>('[data-pz-filtro]')!
  }

  it('filtra por persona, motivo o sección y cuenta lo que se ve', async () => {
    const entrada = await montarHistorial()
    escribir(entrada, 'ana')
    const filas = [...document.querySelectorAll<HTMLElement>('tr[data-busqueda]')]
    expect(filas.map((f) => f.hidden)).toEqual([false, true, false])
    expect(document.querySelector('[data-pz-filtro-conteo]')!.textContent).toBe('2 de 3 versiones')

    escribir(entrada, 'panel')
    expect(filas.map((f) => f.hidden)).toEqual([true, false, true])
  })

  it('sin coincidencias lo dice y al vaciar la búsqueda vuelve todo', async () => {
    const entrada = await montarHistorial()
    escribir(entrada, 'zzzz')
    expect(document.querySelector<HTMLElement>('[data-pz-filtro-vacio]')!.hidden).toBe(false)
    escribir(entrada, '')
    expect(document.querySelector<HTMLElement>('[data-pz-filtro-vacio]')!.hidden).toBe(true)
    expect(document.querySelector('[data-pz-filtro-conteo]')!.textContent).toBe('3 versiones')
    expect(
      [...document.querySelectorAll<HTMLElement>('tr[data-busqueda]')].every((f) => !f.hidden),
    ).toBe(true)
  })
})

describe('las fórmulas del script dan lo mismo que app/utils/color.ts', () => {
  type Pz = {
    normalizarHex(v: unknown): string | null
    razonDeContraste(a: string, b: string): number | null
    nivelDeContraste(r: number): string
    capaDePortada(p: string, i: number): { inicio: string; centro: string; fin: string }
  }
  const pz = async () => {
    await montar()
    return (window as unknown as { __pz: Pz }).__pz
  }

  it('normalizar un color', async () => {
    const p = await pz()
    for (const v of ['#fff', '#FFF', '#8C1D3D', '8c1d3d', ' #abc ', '#abcd', 'rojo', '', '#12']) {
      expect(p.normalizarHex(v), JSON.stringify(v)).toBe(normalizarHex(v))
    }
  })

  it('la razón de contraste y su nivel', async () => {
    const p = await pz()
    const pares = [
      ['#000000', '#ffffff'],
      ['#767676', '#ffffff'],
      ['#8c1d3d', '#ffffff'],
      ['#e0b84a', '#0f1117'],
      ['#f5f5f5', '#ffffff'],
      ['#2563eb', '#f4f6fb'],
    ]
    for (const [a, b] of pares) {
      const ts = razonDeContraste(a, b) as number
      expect(p.razonDeContraste(a, b), `${a} / ${b}`).toBeCloseTo(ts, 10)
      expect(p.nivelDeContraste(ts)).toBe(nivelDeContraste(ts))
    }
    expect(p.razonDeContraste('x', '#fff')).toBeNull()
  })

  it('la capa de la portada, para todas las posiciones del control', async () => {
    const p = await pz()
    for (const color of ['#8c1d3d', '#1b4332', '#123']) {
      for (let i = 0; i <= 120; i += 5) {
        expect(p.capaDePortada(color, i), `${color} ${i}`).toEqual(capaDePortada(color, i))
      }
    }
  })
})
