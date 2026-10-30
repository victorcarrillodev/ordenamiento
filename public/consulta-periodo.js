;(() => {
  const periodo = document.querySelector('[data-consulta-inicio]')
  if (!periodo) return
  const ahora = Date.now()
  const inicio = Date.parse(periodo.dataset.consultaInicio)
  const cierre = Date.parse(periodo.dataset.consultaCierre)
  if (!Number.isFinite(inicio) || !Number.isFinite(cierre)) return
  const etapa = ahora < inicio ? 'pendiente' : ahora < cierre ? 'abierta' : 'concluida'
  if (etapa !== periodo.dataset.consultaEtapa) {
    window.location.reload()
    return
  }
  const siguiente = [periodo.dataset.consultaInicio, periodo.dataset.consultaCierre]
    .map(Date.parse)
    .find((fecha) => fecha > ahora)
  if (!siguiente) return
  // setTimeout acepta hasta ~24 días; un periodo largo se vuelve a comprobar.
  const comprobar = () => {
    if (Date.now() >= siguiente) {
      window.location.reload()
    } else {
      setTimeout(comprobar, Math.min(siguiente - Date.now() + 100, 2147483647))
    }
  }
  comprobar()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() >= siguiente) window.location.reload()
  })
})()
