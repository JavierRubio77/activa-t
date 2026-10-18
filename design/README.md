# Material de diseño de Activa’t

Esta carpeta conserva las propuestas y recursos de diseño de **Activa’t**. No corresponde a la aplicación ACTIVA.

- `activa-t-wordmark-proposals.html`: comparación de propuestas del nombre sobre la pantalla de inicio.
- `activa-t-wordmark-v1.png`: imagen del nombre utilizada para componer una propuesta.
- `activa-t-splash-wordmark-preview.png`: vista previa de esa composición.
- `compose-wordmark.ps1`: genera la composición a partir del recurso de `public/` y la imagen del nombre.
- `render-wordmark-proposals.ps1`: genera una lámina de propuestas con las tipografías disponibles en Windows.

Los scripts se ejecutan manualmente y requieren `System.Drawing` y las fuentes indicadas en ellos. Los recursos que sirve la aplicación están en `public/`; esta carpeta es material de trabajo y referencia, no una dependencia del funcionamiento de la app.
