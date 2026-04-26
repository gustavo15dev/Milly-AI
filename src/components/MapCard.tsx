import React from 'react';

interface MapCardProps {
  location: string;
}

export const MapCard: React.FC<MapCardProps> = ({ location }) => {
  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>IA Travel Artifact</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css" />
    <style>
        :root { --panel-width: 350px; --accent: #2563eb; }
        body { margin: 0; font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; display: flex; height: 100vh; overflow: hidden; background: #fff; }
        
        #map { flex-grow: 1; height: 100%; z-index: 1; }

        .side-panel { 
            width: var(--panel-width); 
            background: #fff; 
            display: flex; 
            flex-direction: column; 
            border-left: 1px solid #e2e8f0;
            box-shadow: -2px 0 10px rgba(0,0,0,0.05);
            z-index: 2;
        }

        .gallery { 
            width: 100%; 
            height: 180px; 
            background: #f1f5f9; 
            display: flex; 
            overflow-x: auto; 
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
        }
        .gallery::-webkit-scrollbar { display: none; }
        .gallery img { 
            height: 100%; 
            min-width: 100%; 
            object-fit: cover; 
            scroll-snap-align: start; 
        }

        .content { padding: 24px; overflow-y: auto; flex-grow: 1; }
        h2 { margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700; line-height: 1.2; }
        p { font-size: 14px; line-height: 1.6; color: #475569; text-align: justify; margin: 0 0 20px 0; }
        
        .btn-group { display: flex; flex-direction: column; gap: 10px; }
        
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 16px;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
        }
        .btn:hover { background: #1d4ed8; transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .btn-secondary { background: #f1f5f9; color: #475569; }
        .btn-secondary:hover { background: #e2e8f0; }

        #loader { 
            position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
            z-index: 1000; background: white; padding: 8px 16px; border-radius: 999px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); 
            font-size: 13px; font-weight: 500; display: none; color: #475569; border: 1px solid #e2e8f0;
        }
        
        .leaflet-routing-container { display: none !important; }

        @media (max-width: 640px) {
            body { flex-direction: column; }
            .side-panel { width: 100%; height: 50vh; border-left: none; border-top: 1px solid #ddd; }
            #map { height: 50vh; }
            .gallery { height: 140px; }
        }
    </style>
</head>
<body>

    <div id="loader">📍 Processando...</div>

    <div id="map"></div>

    <div class="side-panel">
        <div class="gallery" id="image-gallery">
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;background:#f8fafc;">
                Carregando imagens...
            </div>
        </div>
        <div class="content">
            <h2 id="title">Carregando...</h2>
            <p id="description">Aguarde enquanto mapeamos o local.</p>
            
            <div class="btn-group">
                <button id="btn-route" class="btn" style="display:none;">
                    <span style="margin-right: 6px;">🚗</span> Traçar Rota do meu local
                </button>
                <a id="wiki-link" href="#" target="_blank" class="btn btn-secondary" style="display:none;">
                    Ler na Wikipedia →
                </a>
            </div>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js"></script>
    <script>
        const localBusca = "${location.replace(/"/g, '\\"')}";
        let targetCoords = null;
        let routeControl = null;
        let userMarker = null;

        var map = L.map('map', { zoomControl: false }).setView([0, 0], 2);
        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(map);

        async function buscarTudo() {
            const loader = document.getElementById('loader');
            loader.style.display = 'block';

            try {
                const wikiSearchRes = await fetch('https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(localBusca) + '&utf8=&format=json&origin=*');
                const wikiSearchData = await wikiSearchRes.json();
                
                let pageTitle = localBusca;
                if (wikiSearchData.query && wikiSearchData.query.search.length > 0) {
                    pageTitle = wikiSearchData.query.search[0].title;
                }

                let geoRes = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(localBusca));
                let geoData = await geoRes.json();
                
                if(geoData.length === 0) {
                    geoRes = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(pageTitle));
                    geoData = await geoRes.json();
                }

                if(geoData.length > 0) {
                    const { lat, lon, display_name } = geoData[0];
                    targetCoords = L.latLng(lat, lon);
                    map.setView(targetCoords, 15);
                    L.marker(targetCoords).addTo(map)
                        .bindPopup('<b>Destino:</b><br>' + display_name)
                        .openPopup();
                    
                    document.getElementById('btn-route').style.display = 'inline-flex';
                }

                if (wikiSearchData.query && wikiSearchData.query.search.length > 0) {
                    const wikiRes = await fetch('https://pt.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(pageTitle.replace(/ /g, "_")));
                    
                    if(wikiRes.ok) {
                        const wikiData = await wikiRes.json();
                        document.getElementById('title').innerText = wikiData.title;
                        document.getElementById('description').innerText = wikiData.extract || "Local mapeado com sucesso.";
                        
                        const linkEl = document.getElementById('wiki-link');
                        linkEl.href = (wikiData.content_urls && wikiData.content_urls.desktop && wikiData.content_urls.desktop.page) || '#';
                        linkEl.style.display = 'inline-flex';
                        
                        let galleryHtml = '';
                        if(wikiData.thumbnail) {
                            galleryHtml += '<img src="' + wikiData.thumbnail.source + '" alt="' + wikiData.title + '" />';
                        }
                        const seed = wikiData.title.split(' ')[0];
                        galleryHtml += '<img src="https://picsum.photos/seed/' + seed + '1/400/300" alt="Vista">';
                        document.getElementById('image-gallery').innerHTML = galleryHtml;
                    }
                } else if (geoData.length > 0) {
                    document.getElementById('title').innerText = localBusca;
                    document.getElementById('description').innerText = geoData[0].display_name;
                    document.getElementById('image-gallery').innerHTML = '<img src="https://picsum.photos/seed/' + encodeURIComponent(localBusca) + '/400/300" alt="Vista">';
                }

            } catch (error) {
                console.error("Erro na busca:", error);
            } finally {
                loader.style.display = 'none';
            }
        }

        async function obterRota() {
            if (!targetCoords) return;
            const loader = document.getElementById('loader');
            loader.innerText = "📍 Obtendo sua localização...";
            loader.style.display = 'block';

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userPos = L.latLng(position.coords.latitude, position.coords.longitude);
                    
                    if (userMarker) map.removeLayer(userMarker);
                    userMarker = L.circleMarker(userPos, { color: 'blue', radius: 8, fillOpacity: 0.8 }).addTo(map)
                        .bindPopup("Você está aqui").openPopup();

                    if (routeControl) map.removeControl(routeControl);

                    routeControl = L.Routing.control({
                        waypoints: [userPos, targetCoords],
                        routeWhileDragging: false,
                        addWaypoints: false,
                        draggableWaypoints: false,
                        lineOptions: {
                            styles: [{ color: '#2563eb', opacity: 0.8, weight: 6 }]
                        },
                        createMarker: function() { return null; }
                    }).addTo(map);

                    routeControl.on('routesfound', (e) => {
                        const routes = e.routes;
                        const summary = routes[0].summary;
                        const distKm = (summary.totalDistance / 1000).toFixed(1);
                        const timeMin = Math.round(summary.totalTime / 60);
                        
                        const msg = '<div style="margin-top:12px; font-weight:600; color:#2563eb;">⚡ Rota encontrada: ' + distKm + 'km (' + timeMin + ' min)</div>';
                        const desc = document.getElementById('description');
                        if (!desc.innerHTML.includes('Rota encontrada')) {
                            desc.innerHTML += msg;
                        }
                        
                        map.fitBounds(L.latLngBounds([userPos, targetCoords]), { padding: [50, 50] });
                    });

                    loader.style.display = 'none';
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
                    loader.style.display = 'none';
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }

        document.getElementById('btn-route').onclick = obterRota;
        buscarTudo();
    </script>
</body>
</html>
`;

  return (
    <div className="w-full h-[450px] md:h-[500px] mb-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      <iframe
        srcDoc={htmlContent}
        className="w-full h-full border-0"
        title="Map Artifact"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-geolocation"
      />
    </div>
  );
};
