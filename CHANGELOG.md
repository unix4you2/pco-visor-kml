# Changelog

Todas las modificaciones relevantes a este proyecto estarán documentadas en este archivo.

## [1.0.1] - 2025-09-17
### Añadido
- Se permite el cargue de datos mediante archivos remotos en otras URL.  Ej:  https://unix4you2.github.io/pco-visor-kml/index.html?kml=https://tudominio.com/archivo.kml

## [1.0.0] - 2025-08-15
### Añadido
- Versión inicial del Visualizador KML Ultra para archivos con hasta 100,000 puntos.
- Carga eficiente de archivos KML usando DOMParser nativo.
- Rendering de puntos con Leaflet.js y clustering con Leaflet.markercluster.
- Interface ultraligera con canvas rendering para fluidez máxima.
- Controles para clustering on/off, centrar mapa y limpiar datos.
- Soporte básico para mostrar nombres y descripciones en popups.
- Panel lateral minimalista con estadísticas de puntos cargados.
- Optimización del procesamiento en chunks para evitar bloqueo de UI.

### Cambiado
- N/A

### Eliminado
- Logging excesivo y debugging visible en UI para mejorar performance.
