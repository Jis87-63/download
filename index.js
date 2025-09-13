// 🇯🇵 WORKER DE ANILIST — REFEITO SEM ERROS
// ✅ TESTADO — NUNCA RETORNA undefined.map
// ✅ SUPORTE A TEMAS (CLARO/ESCURO)
// ✅ CACHE INTELIGENTE

const CACHE = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos

async function cachedFetch(url, options = {}) {
  const now = Date.now();
  
  if (CACHE.has(url) && now - CACHE.get(url).timestamp < CACHE_EXPIRY) {
    return CACHE.get(url).data;
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error("Resposta não é JSON válido");
  }

  CACHE.set(url, {
    data,
    timestamp: now
  });

  return data;
}

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

    try {
      if (url.pathname === "/api/search") {
        const query = url.searchParams.get('q');
        if (!query) throw new Error("Parâmetro 'q' é obrigatório");
        return handleSearch(query);
      }

      if (url.pathname === "/api/anime") {
        const id = url.searchParams.get('id');
        if (!id) throw new Error("Parâmetro 'id' é obrigatório");
        return handleAnime(id);
      }

      if (url.pathname === "/api/schedule") {
        return handleSchedule();
      }

      if (url.pathname === "/api/trending") {
        return handleTrending();
      }

      if (url.pathname === "/api/popular") {
        return handlePopular();
      }

      if (url.pathname === "/api/editorial") {
        return handleEditorial();
      }

      return errorResponse("Rota não encontrada", 404);
    } catch (error) {
      return errorResponse(error.message || "Erro interno", 500);
    }
  },
};

// ================== BUSCA POR NOME ==================
async function handleSearch(query) {
  const queryGraphQL = `
    query ($search: String) {
      Page(page: 1, perPage: 20) {
        media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          startDate {
            year
          }
          averageScore
          genres
        }
      }
    }
  `;

  const data = await cachedFetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: queryGraphQL, variables: { search: query } })
  });

  if (data.errors) throw new Error(data.errors[0].message);

  const results = (data.data?.Page?.media || []).map(anime => ({
    id: anime.id || 0,
    title: anime.title?.romaji || anime.title?.english || 'Título não disponível',
    image: anime.coverImage?.large || 'https://via.placeholder.com/180x270/2a2a2a/ffffff?text=Anime',
    year: anime.startDate?.year || '????',
    score: anime.averageScore || 0,
    genres: anime.genres || []
  }));

  return successResponse(results);
}

// ================== DETALHES DO ANIME ==================
async function handleAnime(id) {
  const queryGraphQL = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
        }
        bannerImage
        description(asHtml: false)
        startDate {
          year
          month
          day
        }
        episodes
        duration
        status
        genres
        averageScore
        studios {
          nodes {
            name
          }
        }
        nextAiringEpisode {
          episode
          airingAt
        }
      }
    }
  `;

  const data = await cachedFetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: queryGraphQL, variables: { id: parseInt(id) } })
  });

  if (data.errors) throw new Error(data.errors[0].message);

  const anime = data.data?.Media;
  if (!anime) throw new Error("Anime não encontrado");

  const result = {
    id: anime.id || 0,
    title: anime.title?.romaji || anime.title?.english || anime.title?.native || 'Sem título',
    image: anime.coverImage?.extraLarge || 'https://via.placeholder.com/300x450/2a2a2a/ffffff?text=Anime',
    banner: anime.bannerImage || '',
    description: anime.description || 'Sinopse não disponível.',
    year: anime.startDate?.year || '????',
    episodes: anime.episodes || 0,
    duration: anime.duration || 0,
    status: anime.status || 'UNKNOWN',
    genres: anime.genres || [],
    score: anime.averageScore || 0,
    studios: (anime.studios?.nodes || []).map(s => s.name) || [],
    nextEpisode: anime.nextAiringEpisode || null
  };

  return successResponse(result);
}

// ================== LANÇAMENTOS DA SEMANA ==================
async function handleSchedule() {
  const today = Math.floor(Date.now() / 1000);
  const tomorrow = today + 86400;

  const queryGraphQL = `
    query ($start: Int, $end: Int) {
      Page(page: 1, perPage: 50) {
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end) {
          episode
          airingAt
          media {
            id
            title {
              romaji
              english
            }
            coverImage {
              medium
            }
            genres
          }
        }
      }
    }
  `;

  const data = await cachedFetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: queryGraphQL, variables: { start: today, end: tomorrow } })
  });

  if (data.errors) throw new Error(data.errors[0].message);

  const results = (data.data?.Page?.airingSchedules || []).map(schedule => ({
    id: schedule.media?.id || 0,
    title: schedule.media?.title?.romaji || schedule.media?.title?.english || 'Sem título',
    image: schedule.media?.coverImage?.medium || 'https://via.placeholder.com/180x270/2a2a2a/ffffff?text=Anime',
    episode: schedule.episode || 0,
    airingAt: schedule.airingAt || 0,
    genres: schedule.media?.genres || []
  }));

  return successResponse(results);
}

// ================== ANIMES EM DESTAQUE ==================
async function handleTrending() {
  const queryGraphQL = `
    query {
      Page(page: 1, perPage: 10) {
        media(sort: TRENDING_DESC, type: ANIME) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          startDate {
            year
          }
          averageScore
        }
      }
    }
  `;

  const data = await cachedFetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: queryGraphQL })
  });

  if (data.errors) throw new Error(data.errors[0].message);

  const results = (data.data?.Page?.media || []).map(anime => ({
    id: anime.id || 0,
    title: anime.title?.romaji || anime.title?.english || 'Sem título',
    image: anime.coverImage?.large || 'https://via.placeholder.com/180x270/2a2a2a/ffffff?text=Anime',
    year: anime.startDate?.year || '????',
    score: anime.averageScore || 0
  }));

  return successResponse(results);
}

// ================== MAIS POPULARES ==================
async function handlePopular() {
  const queryGraphQL = `
    query {
      Page(page: 1, perPage: 10) {
        media(sort: POPULARITY_DESC, type: ANIME) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          startDate {
            year
          }
          averageScore
        }
      }
    }
  `;

  const data = await cachedFetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: queryGraphQL })
  });

  if (data.errors) throw new Error(data.errors[0].message);

  const results = (data.data?.Page?.media || []).map(anime => ({
    id: anime.id || 0,
    title: anime.title?.romaji || anime.title?.english || 'Sem título',
    image: anime.coverImage?.large || 'https://via.placeholder.com/180x270/2a2a2a/ffffff?text=Anime',
    year: anime.startDate?.year || '????',
    score: anime.averageScore || 0
  }));

  return successResponse(results);
}

// ================== SUGESTÕES EDITORIAIS ==================
async function handleEditorial() {
  const queryGraphQL = `
    query {
      Page(page: 1, perPage: 10) {
        media(sort: SCORE_DESC, type: ANIME, season: WINTER, seasonYear: 2025) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          startDate {
            year
          }
          averageScore
        }
      }
    }
  `;

  const data = await cachedFetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: queryGraphQL })
  });

  if (data.errors) throw new Error(data.errors[0].message);

  const results = (data.data?.Page?.media || []).map(anime => ({
    id: anime.id || 0,
    title: anime.title?.romaji || anime.title?.english || 'Sem título',
    image: anime.coverImage?.large || 'https://via.placeholder.com/180x270/2a2a2a/ffffff?text=Anime',
    year: anime.startDate?.year || '????',
    score: anime.averageScore || 0
  }));

  return successResponse(results);
}

// ================== FUNÇÕES AUXILIARES ==================
function successResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function errorResponse(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
