import type { Handle } from 'remix/ui'
import { Document } from '../document.tsx'
import { NavBar } from '../../components/NavBar.tsx'
import { css } from 'remix/ui'
const title=css({
  margin:"5rem",
  textAlign:"center",
  color: "rgb(171, 163, 163)",

})
const parrafo=css({
 
})
const docOficial = css({
  margin: '0px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: '0',
  width: '100%',
  height: '23rem',
  backgroundColor: '#a52242',
})
const textOficial = css({
  display: 'block',
  width: '100%',
  textAlign: 'center',
  margin: '0',
  padding: '0',
  color: 'white',
  fontSize: '35.2px',
  lineHeight: '1.1',
})
const pOficioal = css({
  color: 'white',

  fontSize: '18.6px',
})
const buttonsContainer = css({
  display: 'flex',
  gap: '73px',
})
const sbutton = css({
  border: 'none',
  cursor: 'pointer',
  borderRadius: '1rem',
  width: '23rem',
  height: '70px',
  color: 'white',
  backgroundColor: '#B5AB78',
  transition: 'background-color 300ms ease, transform 300ms ease',

  '&:hover': {
    backgroundColor: '#B5AB89',
    transform: 'translateY(-4px)',
  },
})

const act = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
})
const actTitle = css({
  fontSize: '35px',
  color: '#444444',
})
const actText = css({
  textAlign: 'center',
  fontSize: '18px',
  color: '#444444',
})
const holaMundo=css({
  color:"grey",
  fontSize:"70px"
})
const futter = css({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: "2rem",
  height: "8rem",
  backgroundColor: "#101909",
  color: "white",
})
const logoFuter =css({
  marginRight: "20rem",
  width:"50px",
  height:"70px"
})

export function PoetdumPage(handle: Handle<{ id: string }>) {
  return () => {
    return (
      <Document title="poetdum">
        <NavBar />
        <br />
        <br />
        <br />

        <main>
          <h1 mix={title} >ELABORACIÓN DEL POETDUM</h1>
          <div>
            <ul>
              <li mix={parrafo}><p>parrafo 1.</p></li>
              <li mix={parrafo}><p>parrafo 2.</p></li>
              <li mix={parrafo}><p>parrafo 3.</p></li>
            </ul>
            <div>
              <img
                src="https://imgs.search.brave.com/rapUnoqLO3crJwhfYp2tbIvgb4a2VG-DOxQJEXHGnpU/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pbWcu/bWFnbmlmaWMuY29t/L3ZlY3Rvci1ncmF0/aXMvbWFwYS1jaXVk/YWQtZXRpcXVldGEt/aG9tZS1waW5fMTI4/NC00MjM0MC5qcGc_/c2VtdD1haXNfaHli/cmlkJnc9NzQwJnE9/ODA"
                alt="mapa"
              />
              
            </div>
          </div>

          <section mix={docOficial}>
            <h2>
              <b mix={textOficial}>
                OBTEN LOS <br /> DOCUMENTOS OFICIALES
              </b>
            </h2>

            <p mix={pOficioal}>
              Descarga aqui el documento completo del Plan de Ordenamiento Ecológico Local (POETDUM)
              y las Fichas de las unidades de gestión ambiental
            </p>
            <div>
              <br />
              <br />
              <br />
              <div mix={buttonsContainer}>
                <button mix={sbutton}>POETDUM</button>
                <button mix={sbutton}>FICHAS</button>
              </div>
            </div>
          </section>
          <br />
          <br />
          <br />
          <br />
          <br />
          <section mix={act}>
            <h2 mix={actTitle}>Calendario de Actividades </h2>
            <p mix={actText}>
              Consulta de manera clara y actualizada todas las fechas programadas, los horarios y
              las ubicaciones de cada sesión. <br /> Navega por el calendario para planificar tu
              asistencia y no perderte ningún evento.
            </p>
          </section>
          <br /><br /><br />
          <h1 mix={holaMundo}>hola mundo </h1>
        <section mix={futter}>
  <img
    mix={logoFuter}
    src="https://ordenamiento.tlaquepaque.gob.mx/img/logos-02.png"
    alt="Logo"
  />

  <p>
    <strong>
      © Copyright 2026 Todos los Derechos Reservados | Aviso de privacidad
    </strong>
  </p>
</section>
        </main>
      </Document>
    )
  }
}
