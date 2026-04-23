import React, { useEffect, useState } from 'react';

interface AudioPlayerCardProps {
  query: string;
}

export const AudioPlayerCard: React.FC<AudioPlayerCardProps> = ({ query }) => {
  const [height] = useState(150); // Mínimo de altura para o iframe card não cortar
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <style>
        :root {
            --bg-card: rgba(255, 255, 255, 0.8);
            --text-main: #0f172a;
            --text-sec: #64748b;
        }

        body { 
            margin: 0; 
            display: flex; 
            justify-content: flex-start; 
            align-items: center; 
            background: transparent;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 10px;
        }

        /* Card Horizontal com efeito Glassmorphism */
        .player-horizontal {
            display: flex;
            align-items: center;
            width: 100%;
            max-width: 450px;
            height: 120px;
            background: #fff;
            border-radius: 20px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
            padding: 12px;
            gap: 15px;
            box-sizing: border-box;
            position: relative;
        }

        /* Capa do Álbum Arredondada */
        .album-art {
            width: 96px;
            height: 96px;
            border-radius: 12px;
            background-size: cover;
            background-position: center;
            background-color: #f1f5f9;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            flex-shrink: 0;
        }

        /* Área de Informações */
        .track-info {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            padding-right: 10px;
        }

        .title {
            font-size: 16px;
            font-weight: 700;
            color: var(--text-main);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 4px;
        }

        .artist {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-sec);
            margin-bottom: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Player de Áudio Estilizado */
        audio {
            width: 100%;
            height: 32px;
            outline: none;
        }

        audio::-webkit-media-controls-enclosure {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
        }

        .badge-deezer {
            position: absolute;
            top: 12px;
            right: 16px;
            font-size: 10px;
            font-weight: 800;
            color: #a8a29e;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
    </style>
</head>
<body>

<div class="player-horizontal">
    <span class="badge-deezer">PREVIEW</span>
    <div id="cover" class="album-art"></div>
    
    <div class="track-info">
        <div id="track-title" class="title">Buscando...</div>
        <div id="artist-name" class="artist">Pela Deezer API</div>
        
        <audio id="audio-player" controls preload="none">
            <source id="audio-src" src="" type="audio/mpeg">
        </audio>
    </div>
</div>

<script>
    const trackSearch = "${query.replace(/"/g, '\\"')}"; 

    async function getMusic() {
        try {
            // Utilizamos a api do Deezer
            // Por causa do CORS, o Deezer na web exige JSONP as vezes, mas a API de busca simples /search costuma passar.
            // Para garantir em iframes, passamos output=jsonp se der erro, mas vamos tentar padrao.
            // O ideal para contornar problemas de CORS em APIs web quando rodados via iframe srcDoc é usar um proxy publico se necessario.
            // Deezer API open access allows simple CORS on general search.
            const res = await fetch(\`https://api.deezer.com/search?q=\${encodeURIComponent(trackSearch)}&limit=1\`);
            const json = await res.json();

            if(json.data && json.data.length > 0) {
                const music = json.data[0];
                
                document.getElementById('track-title').innerText = music.title;
                document.getElementById('artist-name').innerText = music.artist.name;
                document.getElementById('cover').style.backgroundImage = \`url('\${music.album.cover_medium}')\`;
                
                if (music.preview) {
                    const player = document.getElementById('audio-player');
                    document.getElementById('audio-src').src = music.preview;
                    player.load();
                } else {
                    document.getElementById('track-title').innerText = music.title + " (Sem preview)";
                }
            } else {
                 document.getElementById('track-title').innerText = "Música não encontrada";
                 document.getElementById('artist-name').innerText = "Tente ser mais específico";
            }
        } catch (e) {
            // Proxy fallback para CORS se o fetch original falhar
            try {
                const proxyRes = await fetch(\`https://corsproxy.io/?https://api.deezer.com/search?q=\${encodeURIComponent(trackSearch)}&limit=1\`);
                const json = await proxyRes.json();
                
                if(json.data && json.data.length > 0) {
                    const music = json.data[0];
                    document.getElementById('track-title').innerText = music.title;
                    document.getElementById('artist-name').innerText = music.artist.name;
                    document.getElementById('cover').style.backgroundImage = \`url('\${music.album.cover_medium}')\`;
                    
                    if (music.preview) {
                        const player = document.getElementById('audio-player');
                        document.getElementById('audio-src').src = music.preview;
                        player.load();
                    } else {
                        document.getElementById('track-title').innerText = music.title + " (Sem preview)";
                    }
                } else {
                     document.getElementById('track-title').innerText = "Música não encontrada";
                     document.getElementById('artist-name').innerText = "Tente ser mais específico";
                }
            } catch(e2) {
                document.getElementById('track-title').innerText = "Erro ao conectar";
                document.getElementById('artist-name').innerText = "";
            }
        }
    }

    getMusic();
</script>

</body>
</html>
  `;

  return (
    <div className="w-full mb-6">
      <iframe
        srcDoc={htmlContent}
        className="w-full border-0"
        style={{ height: height + 'px' }}
        title="Audio Player"
        sandbox="allow-scripts allow-same-origin allow-media"
      />
    </div>
  );
};
