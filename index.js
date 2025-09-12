// 🎵 WORKER DE DOWNLOAD — TUBEFOLLOW MUSIC + VIDEO (YOUTUBE, TIKTOK, INSTAGRAM)

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (url.pathname === "/api/search") {
      const query = url.searchParams.get('q');
      if (!query) {
        return new Response(JSON.stringify({ error: "Parâmetro 'q' é obrigatório" }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      return handleSearch(query);
    }

    if (url.pathname === "/api/download") {
      const videoUrl = url.searchParams.get('url');
      const format = url.searchParams.get('format') || 'mp3';
      if (!videoUrl) {
        return new Response(JSON.stringify({ error: "Parâmetro 'url' é obrigatório" }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      return handleDownload(videoUrl, format);
    }

    // 👇 RETORNA JSON EM QUALQUER ROTA INVÁLIDA — NUNCA HTML!
    return new Response(JSON.stringify({ error: "Rota não encontrada. Use /api/search ou /api/download" }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  },
};

// ================== BUSCA POR NOME (YOUTUBE) ==================
async function handleSearch(query) {
  try {
    // Usa API pública alternativa (sem chave)
    const apiUrl = `https://ytsearch.vercel.app/api/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(apiUrl);
    
    // Verifica se a resposta é JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Resposta não é JSON");
    }

    const data = await response.json();

    if (data.videos && data.videos.length > 0) {
      const results = data.videos
        .filter(v => v.title && v.url)
        .slice(0, 20)
        .map(v => ({
          title: v.title,
          url: v.url,
          thumbnail: v.thumbnail || "",
          duration: v.duration || "",
          views: v.views || "",
          channel: v.author?.name || ""
        }));

      return new Response(JSON.stringify(results), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    throw new Error("Nenhum resultado encontrado");
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao buscar: " + error.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 500
    });
  }
}

// ================== DOWNLOAD OU STREAM ==================
async function handleDownload(videoUrl, format) {
  try {
    // Detecta plataforma
    let apiUrl = '';
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      apiUrl = `https://ytpp3.com/api/?url=${encodeURIComponent(videoUrl)}&format=${format}`;
    } else if (videoUrl.includes('tiktok.com')) {
      apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`;
    } else if (videoUrl.includes('instagram.com')) {
      apiUrl = `https://ddinstagram.com/api/?url=${encodeURIComponent(videoUrl)}`;
    } else {
      throw new Error("Plataforma não suportada");
    }

    const response = await fetch(apiUrl);
    
    // Verifica se a resposta é JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Resposta não é JSON");
    }

    const data = await response.json();

    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      if (data.success) {
        return new Response(JSON.stringify({
          success: true,
          title: data.title || "",
          thumbnail: data.thumbnail || "",
          audio_url: data.audio?.url || "",
          video_url: data.video?.url || "",
          duration: data.duration || "",
          views: data.views || ""
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } else if (videoUrl.includes('tiktok.com')) {
      if (data.code === 0 && data.data) {
        return new Response(JSON.stringify({
          success: true,
          title: data.data.title || "",
          thumbnail: data.data.cover || "",
          audio_url: data.data.music_url || "",
          video_url: data.data.play || "",
          duration: "",
          views: ""
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } else if (videoUrl.includes('instagram.com')) {
      const text = await response.text();
      const videoMatch = text.match(/"video_url":"(https?:[^"]+)"/);
      const imageMatch = text.match(/"display_url":"(https?:[^"]+)"/);
      
      if (videoMatch && videoMatch[1]) {
        return new Response(JSON.stringify({
          success: true,
          title: "Instagram Video",
          thumbnail: "",
          audio_url: "",
          video_url: videoMatch[1].replace(/\\u0026/g, '&'),
          duration: "",
          views: ""
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else if (imageMatch && imageMatch[1]) {
        return new Response(JSON.stringify({
          success: true,
          title: "Instagram Image",
          thumbnail: imageMatch[1].replace(/\\u0026/g, '&'),
          audio_url: "",
          video_url: "",
          duration: "",
          views: ""
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    throw new Error(data.error || "Não foi possível processar");
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao processar: " + error.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 500
    });
  }
}
