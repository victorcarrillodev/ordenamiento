import type { Handle } from "remix/ui";
import { Document } from "../document.tsx";
import {NavBar } from "../../components/NavBar.tsx";
export function PoetdumPage(handle: Handle<{ id: string }>) {
  return () => {
    return (
      <Document title="poetdum">
     <NavBar/>
     <br /><br /><br />

        <main>
             <h1>poetdum</h1>
             <section>
              <h2>ELABORACIÓN DEL POETDUM</h2>
              <div>
                <img src="https://imgs.search.brave.com/rapUnoqLO3crJwhfYp2tbIvgb4a2VG-DOxQJEXHGnpU/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pbWcu/bWFnbmlmaWMuY29t/L3ZlY3Rvci1ncmF0/aXMvbWFwYS1jaXVk/YWQtZXRpcXVldGEt/aG9tZS1waW5fMTI4/NC00MjM0MC5qcGc_/c2VtdD1haXNfaHli/cmlkJnc9NzQwJnE9/ODA" alt="mapa" />
              </div>
             </section>


             <section><h2>Obten los Documentos oficiales</h2>
             <p>Descarga aqui el documento completo del Plan de Ordenamiento Ecológico Local (POETDUM) y las Fichas de las unidades de gestión ambiental</p>
             <div>
              <button>POETDUM</button>
              <button>FICHAS</button>
             </div>
             </section>
             <section>
              <h3>Calendario de Actividades </h3>
              <p>Consulta de manera clara y actualizada todas las fechas programadas, los horarios y las ubicaciones de cada sesión.
Navega por el calendario para planificar tu asistencia y no perderte ningún evento.</p>

              <div>
                <div>
                  aqui ira las secciones encontradas
                </div>
                <div>detalles de reunion</div>
              </div>
             </section>
             <h1>hola mundo </h1>
             <section>
              <div>
                <h5>aqui ira un backgraun image</h5>
              </div>
              <p> <strong>© Copyright 2026 Todos los Derechos Reservados | Aviso de privacidad</strong></p>
             </section>
        </main>
      </Document>
    );
  };
}