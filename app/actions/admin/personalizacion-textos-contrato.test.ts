import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { CLAVES_TEXTO_RICO } from '../../../backend/src/services/textos-portal.ts'
import { GRUPOS_TEXTOS } from './personalizacion-textos-defs.ts'

/**
 * El panel marca con `rico` los textos que llevan el editor de formato y el
 * backend, con `CLAVES_TEXTO_RICO`, los que deja canónicos al guardar. Si las
 * listas se separaran, un texto formateado se guardaría como texto plano (se
 * perdería el formato) o uno plano se guardaría como HTML.
 */
const CAMPOS = GRUPOS_TEXTOS.flatMap((grupo) => grupo.campos)

describe('textos del portal con formato: panel y backend coinciden', () => {
  it('son los mismos textos', () => {
    const delPanel = CAMPOS.filter((campo) => campo.rico).map((campo) => campo.key)
    expect([...delPanel].sort()).toEqual([...CLAVES_TEXTO_RICO].sort())
  })

  it('todos existen entre los textos que se pueden editar y entre los del backend', () => {
    const backend = readFileSync(
      new URL('../../../backend/src/services/customizations.ts', import.meta.url),
      'utf8',
    )
    const claves = new Set(CAMPOS.map((campo) => campo.key))
    for (const clave of CLAVES_TEXTO_RICO) {
      expect(claves.has(clave), `${clave} no está en el panel`).toBe(true)
      expect(backend, `${clave} no está en los textos del backend`).toMatch(
        new RegExp(`^\\s+${clave}:`, 'm'),
      )
    }
  })

  it('los títulos, etiquetas y botones siguen siendo texto plano', () => {
    const planos = CAMPOS.filter((campo) => !campo.rico).map((campo) => campo.key)
    for (const clave of ['heroTitulo', 'navCtaRegistrar', 'ctaBoton', 'fasesCta', 'footerEmail']) {
      expect(planos).toContain(clave)
    }
  })
})
