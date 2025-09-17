// Estado global de la aplicación optimizada
let app = {
    map: null,
    points: [],
    markers: null,
    clusteringEnabled: true
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    console.log('Iniciando aplicación KML...');
    initializeMap();
    setupEventListeners();
    updateStats();
}

function initializeMap() {
    try {
        console.log('Inicializando mapa...');
        
        // Mapa optimizado con Canvas rendering
        app.map = L.map('map', {
            center: [20, 0],
            zoom: 2,
            zoomControl: true,
            attributionControl: true,
            preferCanvas: true
        });

        // Tile layer principal con fallback
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
            maxZoom: 18,
            subdomains: ['a', 'b', 'c'],
            crossOrigin: true
        }).addTo(app.map);

        // Configuración de clustering optimizado
        app.markers = L.markerClusterGroup({
            chunkedLoading: true,
            chunkInterval: 200,
            chunkDelay: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            maxClusterRadius: 50,
            disableClusteringAtZoom: 18
        });

        app.map.addLayer(app.markers);

        // Event listeners del mapa
        app.map.on('zoomend', updateZoomLevel);
        app.map.on('moveend', updateZoomLevel);
        
        // Force resize después de un breve delay
        setTimeout(() => {
            app.map.invalidateSize();
            console.log('Mapa inicializado correctamente');
        }, 100);

    } catch (error) {
        console.error('Error inicializando mapa:', error);
        showError('Error inicializando el mapa: ' + error.message);
    }
}

function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Event listener para el botón principal de carga
    const loadKmlBtn = document.getElementById('loadKmlBtn');
    if (loadKmlBtn) {
        loadKmlBtn.addEventListener('click', openFileDialog);
        console.log('Event listener agregado al botón Cargar KML');
    }

    // Event listener para el toggle del sidebar
    const toggleBtn = document.getElementById('toggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSidebar);
        console.log('Event listener agregado al toggle del sidebar');
    }

    // Event listener para el botón de clustering
    const clusterBtn = document.getElementById('clusterBtn');
    if (clusterBtn) {
        clusterBtn.addEventListener('click', toggleClustering);
        console.log('Event listener agregado al botón de clustering');
    }

    // Event listener para el botón fit bounds
    const fitBtn = document.getElementById('fitBtn');
    if (fitBtn) {
        fitBtn.addEventListener('click', fitBounds);
        console.log('Event listener agregado al botón fit bounds');
    }

    // Event listener para el botón clear
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAll);
        console.log('Event listener agregado al botón clear');
    }

    // Event listener para cerrar error
    const hideErrorBtn = document.getElementById('hideErrorBtn');
    if (hideErrorBtn) {
        hideErrorBtn.addEventListener('click', hideError);
        console.log('Event listener agregado al botón cerrar error');
    }
    
    // Event listener para el input de archivo
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
        console.log('Event listener agregado al input de archivo');
    }
}

// Funciones principales
function openFileDialog() {
    console.log('Abriendo diálogo de archivo...');
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = ''; // Limpiar valor previo
        fileInput.click();
        console.log('Diálogo de archivo activado');
    } else {
        console.error('No se encontró el elemento fileInput');
        showError('Error: No se puede abrir el selector de archivos');
    }
}

function handleFileSelect(event) {
    console.log('Manejando selección de archivo...');
    const file = event.target.files[0];
    if (!file) {
        console.log('No se seleccionó archivo');
        return;
    }

    console.log('Archivo seleccionado:', file.name, 'Tamaño:', file.size);

    // Validación básica
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.kml')) {
        console.error('Tipo de archivo inválido:', fileName);
        showError('Por favor selecciona un archivo KML válido (.kml)');
        return;
    }

    showLoading('Cargando archivo KML...');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        console.log('Archivo leído, iniciando parsing...');
        parseKMLFile(e.target.result);
    };
    reader.onerror = (e) => {
        console.error('Error leyendo archivo:', e);
        hideLoading();
        showError('Error leyendo el archivo');
    };
    
    reader.readAsText(file);
}

function parseKMLFile(kmlText) {
    try {
        console.log('Iniciando parsing KML, longitud:', kmlText.length);
        updateProgress(20, 'Analizando estructura KML...');
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
        
        // Verificar errores de parsing
        const parserError = xmlDoc.getElementsByTagName('parsererror');
        if (parserError.length > 0) {
            console.error('Error de parsing XML:', parserError[0].textContent);
            throw new Error('Archivo KML inválido - Error de XML');
        }
        
        updateProgress(40, 'Extrayendo puntos...');
        
        // Encontrar placemarks con múltiples métodos
        let placemarks = xmlDoc.getElementsByTagName('Placemark');
        console.log('Placemarks encontrados (método 1):', placemarks.length);
        
        if (placemarks.length === 0) {
            placemarks = xmlDoc.getElementsByTagNameNS('*', 'Placemark');
            console.log('Placemarks encontrados (método 2):', placemarks.length);
        }
        
        const points = [];
        
        for (let i = 0; i < placemarks.length; i++) {
            try {
                const placemark = placemarks[i];
                
                // Extraer nombre
                let nameEl = placemark.getElementsByTagName('name')[0];
                if (!nameEl) nameEl = placemark.getElementsByTagNameNS('*', 'name')[0];
                const name = nameEl ? nameEl.textContent.trim() : `Punto ${i + 1}`;
                
                // Extraer descripción
                let descEl = placemark.getElementsByTagName('description')[0];
                if (!descEl) descEl = placemark.getElementsByTagNameNS('*', 'description')[0];
                const description = descEl ? descEl.textContent.trim() : '';
                
                // Encontrar elemento Point
                let pointEl = placemark.getElementsByTagName('Point')[0];
                if (!pointEl) pointEl = placemark.getElementsByTagNameNS('*', 'Point')[0];
                
                if (pointEl) {
                    let coordsEl = pointEl.getElementsByTagName('coordinates')[0];
                    if (!coordsEl) coordsEl = pointEl.getElementsByTagNameNS('*', 'coordinates')[0];
                    
                    if (coordsEl && coordsEl.textContent) {
                        const coordsText = coordsEl.textContent.trim();
                        const coordsParts = coordsText.split(/[,\s]+/).filter(part => part.length > 0);
                        
                        if (coordsParts.length >= 2) {
                            const lng = parseFloat(coordsParts[0]);
                            const lat = parseFloat(coordsParts[1]);
                            
                            if (!isNaN(lat) && !isNaN(lng) && 
                                lat >= -90 && lat <= 90 && 
                                lng >= -180 && lng <= 180) {
                                
                                points.push({
                                    name: name,
                                    description: description,
                                    lat: lat,
                                    lng: lng
                                });
                            }
                        }
                    }
                }
                
                // Actualizar progreso periódicamente
                if (i % 500 === 0) {
                    const progress = 40 + (i / placemarks.length) * 40;
                    updateProgress(Math.round(progress), `Procesando: ${points.length} puntos encontrados`);
                }
            } catch (error) {
                console.warn(`Error procesando placemark ${i}:`, error);
            }
        }
        
        console.log('Puntos extraídos:', points.length);
        updateProgress(80, 'Renderizando en el mapa...');
        
        if (points.length === 0) {
            throw new Error('No se encontraron puntos válidos en el archivo KML');
        }
        
        app.points = points;
        renderPointsOnMap();
        
        updateProgress(100, 'Completado');
        setTimeout(() => {
            hideLoading();
            fitBounds();
        }, 500);
        
    } catch (error) {
        console.error('Error procesando KML:', error);
        hideLoading();
        showError('Error procesando KML: ' + error.message);
    }
}

function renderPointsOnMap() {
    console.log('Renderizando', app.points.length, 'puntos en el mapa');
    
    // Limpiar marcadores existentes
    app.markers.clearLayers();
    
    // Renderizado por chunks para mejor performance
    loadPointsInChunks(app.points, 1000);
    
    updateStats();
    enableControls();
}

function loadPointsInChunks(points, chunkSize = 1000) {
    const chunks = [];
    for (let i = 0; i < points.length; i += chunkSize) {
        chunks.push(points.slice(i, i + chunkSize));
    }
    
    console.log(`Cargando ${points.length} puntos en ${chunks.length} chunks`);
    
    chunks.forEach((chunk, index) => {
        setTimeout(() => {
            const leafletMarkers = [];
            
            chunk.forEach(point => {
                // Usar circleMarkers para mejor performance
                const marker = L.circleMarker([point.lat, point.lng], {
                    radius: 6,
                    fillColor: '#1FB8CD',
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
                
                // Popup simple
                const popupContent = `<b>${point.name}</b>${point.description ? '<br>' + point.description : ''}`;
                marker.bindPopup(popupContent);
                
                leafletMarkers.push(marker);
            });
            
            // Agregar todos de una vez (más eficiente)
            app.markers.addLayers(leafletMarkers);
            console.log(`Chunk ${index + 1}/${chunks.length} agregado`);
            
        }, index * 50);
    });
}

// Controles del UI
function toggleSidebar() {
    console.log('Alternando sidebar...');
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('expanded');
    
    setTimeout(() => {
        if (app.map) {
            app.map.invalidateSize();
        }
    }, 300);
}

function toggleClustering() {
    console.log('Alternando clustering...');
    const clusterBtn = document.getElementById('clusterBtn');
    const clusterText = document.getElementById('clusterText');
    
    if (app.clusteringEnabled) {
        app.map.removeLayer(app.markers);
        app.clusteringEnabled = false;
        clusterText.textContent = 'Activar Clustering';
        clusterBtn.classList.remove('btn--active');
        
        // Agregar marcadores directamente al mapa
        app.points.forEach(point => {
            const marker = L.circleMarker([point.lat, point.lng], {
                radius: 4,
                fillColor: '#1FB8CD',
                color: '#ffffff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.7
            });
            const popupContent = `<b>${point.name}</b>${point.description ? '<br>' + point.description : ''}`;
            marker.bindPopup(popupContent);
            marker.addTo(app.map);
        });
        console.log('Clustering desactivado');
    } else {
        // Limpiar marcadores individuales
        app.map.eachLayer(layer => {
            if (layer instanceof L.CircleMarker && layer !== app.markers) {
                app.map.removeLayer(layer);
            }
        });
        
        app.map.addLayer(app.markers);
        app.clusteringEnabled = true;
        clusterText.textContent = 'Desactivar Clustering';
        clusterBtn.classList.add('btn--active');
        console.log('Clustering activado');
    }
}

function fitBounds() {
    if (app.points.length === 0) {
        console.log('No hay puntos para centrar');
        return;
    }
    
    console.log('Centrando vista en', app.points.length, 'puntos');
    
    const bounds = new L.LatLngBounds();
    app.points.forEach(point => {
        bounds.extend([point.lat, point.lng]);
    });
    
    app.map.fitBounds(bounds, { padding: [20, 20] });
}

function clearAll() {
    console.log('Limpiando todos los datos...');
    app.points = [];
    app.markers.clearLayers();
    
    // Limpiar también marcadores individuales
    app.map.eachLayer(layer => {
        if (layer instanceof L.CircleMarker) {
            app.map.removeLayer(layer);
        }
    });
    
    updateStats();
    disableControls();
    
    // Reset clustering
    if (!app.clusteringEnabled) {
        app.map.addLayer(app.markers);
        app.clusteringEnabled = true;
        document.getElementById('clusterText').textContent = 'Desactivar Clustering';
        document.getElementById('clusterBtn').classList.add('btn--active');
    }
    
    // Reset file input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
    }
    
    console.log('Datos limpiados');
}

// Utilidades de UI
function updateStats() {
    const pointCount = document.getElementById('pointCount');
    if (pointCount) {
        pointCount.textContent = app.points.length.toLocaleString();
    }
    
    updateZoomLevel();
}

function updateZoomLevel() {
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel && app.map) {
        zoomLevel.textContent = Math.round(app.map.getZoom());
    }
}

function enableControls() {
    const fitBtn = document.getElementById('fitBtn');
    if (fitBtn) {
        fitBtn.disabled = false;
    }
}

function disableControls() {
    const fitBtn = document.getElementById('fitBtn');
    if (fitBtn) {
        fitBtn.disabled = true;
    }
}

// Overlays de carga y error
function showLoading(message) {
    console.log('Mostrando loading:', message);
    const loadingText = document.getElementById('loadingText');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (loadingText) loadingText.textContent = message;
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    updateProgress(0, message);
}

function hideLoading() {
    console.log('Ocultando loading');
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function updateProgress(percent, message) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const loadingText = document.getElementById('loadingText');
    
    if (progressFill) progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (progressText) progressText.textContent = `${Math.round(percent)}%`;
    if (message && loadingText) loadingText.textContent = message;
}

function showError(message) {
    console.error('Mostrando error:', message);
    const errorText = document.getElementById('errorText');
    const errorOverlay = document.getElementById('errorOverlay');
    
    if (errorText) errorText.textContent = message;
    if (errorOverlay) errorOverlay.style.display = 'flex';
}

function hideError() {
    console.log('Ocultando error');
    const errorOverlay = document.getElementById('errorOverlay');
    if (errorOverlay) {
        errorOverlay.style.display = 'none';
    }
}

// Event listeners de ventana
window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('expanded');
    }
    
    if (app.map) {
        setTimeout(() => {
            app.map.invalidateSize();
        }, 100);
    }
});

// Optimización de performance
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && app.map) {
        setTimeout(() => {
            app.map.invalidateSize();
        }, 100);
    }
});

function loadKMLFromURL(kmlUrl) {
    showLoading('Cargando archivo KML desde URL...');

    fetch(kmlUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error('No se pudo cargar el archivo KML');
        }
        return response.text();
    })
    .then(kmlText => {
        console.log('Archivo KML cargado, iniciando parsing...');
        parseKMLFile(kmlText);
    })
    .catch(error => {
        console.error('Error cargando archivo KML:', error);
        hideLoading();
        showError('Error cargando el archivo KML desde URL');
    });
}


/*
IMPORTANTE:  Si requiere usar el parametro ?kml=https://tudominio.com
Es probable que requieras agregar autorización a los dominios remotos
para que puedan cargar el KML remoto.

<Directory "/ruta/a/tu/folder">
    <IfModule mod_headers.c>
        <FilesMatch "\.(kml)$">
            Header set Access-Control-Allow-Origin "*"
        </FilesMatch>
    </IfModule>
</Directory>

MODO DE USO:
Llame el visor 
https://unix4you2.github.io/pco-visor-kml/index.html?kml=https://tudominio.com/archivo.kml
*/

// Revisa si tiene parametro con el archivo KML
(function() {
    // Verificar parámetros URL al cargar
    const urlParams = new URLSearchParams(window.location.search);
    const kmlParam = urlParams.get('kml');
    if (kmlParam) {
        // Esperar a que el mapa esté inicializado
        setTimeout(() => {
            const decodedUrl = decodeURIComponent(kmlParam);
            // Usar tu función existente para cargar el archivo KML
            if (typeof window.loadKMLFromURL === 'function') {
                window.loadKMLFromURL(decodedUrl);
            } else {
                // Simular carga de archivo si no existe la función
                console.log('Cargando KML desde:', decodedUrl);
            }
        }, 1000);
    }
})();
