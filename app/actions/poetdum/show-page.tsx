import { Document } from '../document.tsx'
import { NavBar } from '../../components/Nav/NavBar.tsx'
import { css, type Handle } from 'remix/ui'
import { Mapa } from '../../components/Map/Mapa.tsx'
const title = css({
  margin: '5rem',
  textAlign: 'center',
  color: 'rgb(171, 163, 163)',
})

const containerMap = css({
  display: 'flex',
  flexDirection: 'row',
  width: '70%',
  height: '50%',
  padding:"100px",
})
const infoMap = css({
  paddingTop:"50px",
  paddingLeft:"30px"

})
const color1=css({
  width:"20px",
  height:"10px",
  backgroundColor:"greenyellow"

})
const color2=css({
  width:"20px",
  height:"10px",
  backgroundColor:"darkorange"

})
const color3=css({
  width:"20px",
  height:"10px",
  backgroundColor:"cornflowerblue"

})
const color4=css({
  width:"20px",
  height:"10px",
  backgroundColor:"red"

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
const detalles =css({
  padding:"2rem",
  display:"flex",
  justifyContent:"center"
})
const button=css({
  borderRadius:"1rem",
    backgroundColor: "#C84067",
height:"2.5rem",
width:"7rem",

  
})
const futter = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2rem',
  height: '8rem',
  backgroundColor: '#101909',
  color: 'white',
})
const logoFuter = css({
  marginRight: '20rem',
  width: '50px',
  height: '70px',
})

export function PoetdumPage(handle: Handle<{ theme?: any }>) {
  return () => {
    const theme = handle.props.theme
    return (
      <Document title="poetdum">
        <NavBar theme={theme} />
        <br />
        <br />
        <br />

        <main>
        
          <h1 mix={title}>ELABORACIÓN DEL POETDUM</h1>
          <div>
            <div mix={containerMap}>
              <Mapa />
              <div mix={infoMap}>
                <section>
                  <table>
                    <tr>
                      
                     
                    </tr>
                  </table>
                  <table >
                    <thead>
                      <tr>
                        <th>Simbologia</th>
                        <th > Color</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>proteccion</td>
                        <td mix={color1}></td>
                      </tr>
                      <tr>
                        <td>Conservacion</td>
                        <td mix={color2}></td>
                      </tr>
                      <tr>
                        <td>Restauracion</td>
                        <td mix={color3}></td>
                      </tr>
                      <tr>
                        <td>Aprovechamiento sustentable</td>
                        <td mix={color4}>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>
              </div>
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
          <div mix={detalles
          }>
            <button mix ={button}>Detalles de la  reunion</button>
          </div>
          <br />
          <br />
          <br />
          <section mix={futter}>
            <img
              mix={logoFuter}
              src="https://ordenamiento.tlaquepaque.gob.mx/img/logos-02.png"
              alt="Logo"
            />

            <p>
              <strong>© Copyright 2026 Todos los Derechos Reservados | Aviso de privacidad</strong>
            </p>
          </section>
        </main>
      </Document>
    )
  }
}
