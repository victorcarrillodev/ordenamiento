import type { Handle } from "remix/ui";
import { Document } from "../document.tsx";

export function PoetdumPage(handle: Handle<{ id: string }>) {
  return () => {
    return (
      <Document title="poetdum">
        <main>
          <h1>Hola mundo desde poetdum</h1>
        </main>
      </Document>
    );
  };
}