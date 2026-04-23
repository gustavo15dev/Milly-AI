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
    <style>
        :root { --panel-width: 350px; }
        body { margin: 0; font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; display: flex; height: 100vh; overflow: hidden; background: #fff; }
        
        /* Lado Esquerdo: MAPA */
        #map { flex-grow: 1; height: 100%; z-index: 1; }

        /* Lado Direito: PAINEL DE INFO */
        .side-panel { 
            width: var(--panel-width); 
            background: #fff; 
            display: flex; 
            flex-direction: column; 
            border-left: 1px solid #ddd;
            box-shadow: -2px 0 10px rgba(0,0,0,0.05);
            z-index: 2;
        }

        /* Galeria de Imagens */
        .gallery { 
            width: 100%; 
            height: 200px; 
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

        /* Conteúdo de Texto */
        .content { padding: 24px; overflow-y: auto; flex-grow: 1; }
        h2 { margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700; line-height: 1.2; }
        p { font-size: 14px; line-height: 1.6; color: #475569; text-align: justify; margin: 0 0 16px 0; }
        
        .source-link { 
            display: inline-flex; 
            align-items: center;
            color: #2563eb; 
            text-decoration: none; 
            font-size: 13px; 
            font-weight: 600;
            transition: color 0.2s;
        }
        .source-link:hover { color: #1d4ed8; }

        /* Badge de Carregamento */
        #loader { 
            position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
            z-index: 1000; background: white; padding: 8px 16px; border-radius: 999px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); 
            font-size: 13px; font-weight: 500; display: none; color: #475569; border: 1px solid #e2e8f0;
        }

        @media (max-width: 640px) {
            body { flex-direction: column; }
            .side-panel { width: 100%; height: 50vh; border-left: none; border-top: 1px solid #ddd; }
            #map { height: 50vh; }
            .gallery { height: 160px; }
        }
    </style>
</head>
<body>

    <div id="loader">📍 Buscando localização...</div>

    <div id="map"></div>

    <div class="side-panel">
        <div class="gallery" id="image-gallery">
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;background:#f8fafc;">
                Carregando imagens...
            </div>
        </div>
        <div class="content">
            <h2 id="title">Carregando...</h2>
            <p id="description">Aguarde enquanto coletamos dados da Wikipedia e mapeamos o local.</p>
            <a id="wiki-link" href="#" target="_blank" class="source-link" style="display:none;">Ler na Wikipedia →</a>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        const localBusca = "${location.replace(/"/g, '\\"')}";
        var map = L.map('map').setView([0, 0], 2);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(map);

        async function buscarTudo() {
            document.getElementById('loader').style.display = 'block';

            try {
                // 1. BUSCAR TEXTO E IMAGEM (Wikipedia API) primeiro para tentar corrigir a string
                const wikiSearchRes = await fetch(\`https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=\${encodeURIComponent(localBusca)}&utf8=&format=json&origin=*\`);
                const wikiSearchData = await wikiSearchRes.json();
                
                let pageTitle = localBusca;
                if (wikiSearchData.query && wikiSearchData.query.search.length > 0) {
                    pageTitle = wikiSearchData.query.search[0].title;
                }

                // 2. BUSCAR COORDENADAS (Nominatim)
                let geoRes = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(localBusca)}\`);
                let geoData = await geoRes.json();
                
                // Fallback 1: Buscar pelo título oficial da Wikipedia
                if(geoData.length === 0) {
                    geoRes = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(pageTitle)}\`);
                    geoData = await geoRes.json();
                }

                // Fallback 2: Tentar sem preposições/vírgulas, só com a primeira parte
                if(geoData.length === 0 && localBusca.includes(',')) {
                    geoRes = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(localBusca.split(',')[0].trim())}\`);
                    geoData = await geoRes.json();
                }
                
                let foundLocation = false;
                if(geoData.length > 0) {
                    const { lat, lon, display_name } = geoData[0];
                    map.setView([lat, lon], 15);
                    L.marker([lat, lon]).addTo(map).bindPopup(display_name).openPopup();
                    foundLocation = true;
                } else {
                    document.getElementById('title').innerText = localBusca;
                    document.getElementById('description').innerText = "Não conseguimos encontrar as coordenadas exatas para este local no OpenStreetMap.";
                }

                // 3. Pegar resumo de conteúdo da Wikipedia
                if (wikiSearchData.query && wikiSearchData.query.search.length > 0) {
                    const wikiRes = await fetch(\`https://pt.wikipedia.org/api/rest_v1/page/summary/\${encodeURIComponent(pageTitle.replace(/ /g, "_"))}\`);
                    
                    if(wikiRes.ok) {
                        const wikiData = await wikiRes.json();
                        
                        // Atualiza titulo e descricao
                        document.getElementById('title').innerText = wikiData.title;
                        document.getElementById('description').innerText = wikiData.extract || "Sem descrição detalhada disponível.";
                        
                        const linkEl = document.getElementById('wiki-link');
                        linkEl.href = wikiData.content_urls?.desktop?.page || '#';
                        linkEl.style.display = 'inline-flex';
                        
                        // Atualiza a galeria
                        let galleryHtml = '';
                        if(wikiData.thumbnail) {
                            galleryHtml += \`<img src="\${wikiData.thumbnail.source}" alt="\${wikiData.title}" />\`;
                        }
                        
                        // Fallback temporário para imagens extras com base no titulo
                        const searchQueryTerm = encodeURIComponent(wikiData.title.split(' ')[0]);
                        galleryHtml += \`<img src="https://picsum.photos/seed/\${searchQueryTerm}1/400/300" alt="Vista 1">\`;
                        galleryHtml += \`<img src="https://picsum.photos/seed/\${searchQueryTerm}2/400/300" alt="Vista 2">\`;
                        
                        document.getElementById('image-gallery').innerHTML = galleryHtml;

                    } else if (foundLocation) {
                        document.getElementById('title').innerText = localBusca;
                        document.getElementById('description').innerText = geoData[0].display_name;
                        document.getElementById('image-gallery').innerHTML = \`<img src="https://picsum.photos/seed/\${encodeURIComponent(localBusca)}/400/300" alt="Vista">\`;
                    }
                } else if (foundLocation) {
                    document.getElementById('title').innerText = localBusca;
                    document.getElementById('description').innerText = geoData[0].display_name;
                     document.getElementById('image-gallery').innerHTML = \`<img src="https://picsum.photos/seed/\${encodeURIComponent(localBusca)}/400/300" alt="Vista">\`;
                }

            } catch (error) {
                console.error("Erro na busca:", error);
                if (document.getElementById('title').innerText === "Carregando...") {
                    document.getElementById('title').innerText = localBusca;
                    document.getElementById('description').innerText = "Não foi possível carregar os detalhes completos do local no momento.";
                }
            } finally {
                document.getElementById('loader').style.display = 'none';
            }
        }

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
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
};
