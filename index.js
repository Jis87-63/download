// 🎵 WORKER DE DOWNLOAD — TUBEFOLLOW MUSIC

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

    // Se não for /api/search ou /api/download, retorna erro 404 em JSON
    return new Response(JSON.stringify({ error: "Rota não encontrada. Use /api/search ou /api/download" }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  },
};

// ================== BUSCA POR NOME (SEM CHAVE — API PÚBLICA) ==================
async function handleSearch(query) {
  try {
    const apiUrl = `https://ytsearch.vercel.app/api/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(apiUrl);
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
    const apiUrl = `https://ytpp3.com/api/?url=${encodeURIComponent(videoUrl)}&format=${format}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

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
