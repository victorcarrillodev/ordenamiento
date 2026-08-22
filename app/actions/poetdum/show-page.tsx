import type { Handle } from "remix/ui";
import { Document } from "../document.tsx";

import {NavBar} from "../../components/Nav.tsx"
export function PoetdumPage(handle: Handle<{ id: string }>) {
  return () => {
    return (
      <Document title="poetdum">
    <NavBar/>

        <main>
          <h1>Hola mundo desde poetdum</h1>
        </main>
      </Document>
    );
  };
}