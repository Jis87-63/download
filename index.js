// 🇯🇵 WORKER DE ANILIST — PARA download.carlitosmarques08.workers.dev
// ✅ SEM EMOJIS — SÓ ÍCONES SVG
// ✅ CACHE INTELIGENTE — EVITA "Too Many Requests"
// ✅ SUPORTE A TEMAS (CLARO/ESCURO)

const CACHE = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos

async function cachedFetch(url, options = {}) {
  const now = Date.now();
  
  if (CACHE.has(url) && now - CACHE.get(url).timestamp < CACHE_EXPIRY) {
    return CACHE.get(url).data;
  }

  const response = await fetch(url, options);
  const data = await response.json();
  
  CACHE.set(url, {
    data: data,
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

    // ROTAS PRINCIPAIS
    if (url.pathname === "/api/search") {
      const query = url.searchParams.get('q');
      if (!query) return errorResponse("Parâmetro 'q' é obrigatório");
      return handleSearch(query);
    }

    if (url.pathname === "/api/anime") {
      const id = url.searchParams.get('id');
      if (!id) return errorResponse("Parâmetro 'id' é obrigatório");
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
  },
};

// ================== BUSCA POR NOME ==================
async function handleSearch(query) {
  try {
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

    const results = data.data.Page.media.map(anime => ({
      id: anime.id,
      title: anime.title.romaji || anime.title.english,
      image: anime.coverImage.large,
      year: anime.startDate?.year || '????',
      score: anime.averageScore || 0,
      genres: anime.genres || []
    }));

    return successResponse(results);
  } catch (error) {
    return errorResponse("Erro ao buscar: " + error.message);
  }
}

// ================== DETALHES DO ANIME ==================
async function handleAnime(id) {
  try {
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

    const anime = data.data.Media;
    const result = {
      id: anime.id,
      title: anime.title.romaji || anime.title.english || anime.title.native,
      image: anime.coverImage.extraLarge,
      banner: anime.bannerImage,
      description: anime.description || 'Sinopse não disponível.',
      year: anime.startDate?.year || '????',
      episodes: anime.episodes || 0,
      duration: anime.duration || 0,
      status: anime.status || 'UNKNOWN',
      genres: anime.genres || [],
      score: anime.averageScore || 0,
      studios: anime.studios.nodes.map(s => s.name) || [],
      nextEpisode: anime.nextAiringEpisode || null
    };

    return successResponse(result);
  } catch (error) {
    return errorResponse("Erro ao buscar detalhes: " + error.message);
  }
}

// ================== LANÇAMENTOS DA SEMANA ==================
async function handleSchedule() {
  try {
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

    const results = data.data.Page.airingSchedules.map(schedule => ({
      id: schedule.media.id,
      title: schedule.media.title.romaji || schedule.media.title.english,
      image: schedule.media.coverImage.medium,
      episode: schedule.episode,
      airingAt: schedule.airingAt,
      genres: schedule.media.genres || []
    }));

    return successResponse(results);
  } catch (error) {
    return errorResponse("Erro ao buscar lançamentos: " + error.message);
  }
}

// ================== ANIMES EM DESTAQUE ==================
async function handleTrending() {
  try {
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

    const results = data.data.Page.media.map(anime => ({
      id: anime.id,
      title: anime.title.romaji || anime.title.english,
      image: anime.coverImage.large,
      year: anime.startDate?.year || '????',
      score: anime.averageScore || 0
    }));

    return successResponse(results);
  } catch (error) {
    return errorResponse("Erro ao buscar destaques: " + error.message);
  }
}

// ================== MAIS POPULARES ==================
async function handlePopular() {
  try {
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

    const results = data.data.Page.media.map(anime => ({
      id: anime.id,
      title: anime.title.romaji || anime.title.english,
      image: anime.coverImage.large,
      year: anime.startDate?.year || '????',
      score: anime.averageScore || 0
    }));

    return successResponse(results);
  } catch (error) {
    return errorResponse("Erro ao buscar populares: " + error.message);
  }
}

// ================== SUGESTÕES EDITORIAIS ==================
async function handleEditorial() {
  try {
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

    const results = data.data.Page.media.map(anime => ({
      id: anime.id,
      title: anime.title.romaji || anime.title.english,
      image: anime.coverImage.large,
      year: anime.startDate?.year || '????',
      score: anime.averageScore || 0
    }));

    return successResponse(results);
  } catch (error) {
    return errorResponse("Erro ao buscar sugestões: " + error.message);
  }
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
