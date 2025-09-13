// 🇯🇵 WORKER DE ANILIST — BUSCA ANIMES, DETALHES, LANÇAMENTOS

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

    if (url.pathname === "/api/anime") {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: "Parâmetro 'id' é obrigatório" }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      return handleAnime(id);
    }

    if (url.pathname === "/api/schedule") {
      return handleSchedule();
    }

    return new Response(JSON.stringify({ error: "Rota não encontrada. Use /api/search, /api/anime ou /api/schedule" }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
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
              native
            }
            coverImage {
              large
              medium
            }
            startDate {
              year
              month
              day
            }
            episodes
            status
            genres
            averageScore
            description(asHtml: false)
          }
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: queryGraphQL,
        variables: { search: query }
      })
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    const results = data.data.Page.media.map(anime => ({
      id: anime.id,
      title: anime.title.romaji || anime.title.english || anime.title.native,
      image: anime.coverImage.large || anime.coverImage.medium,
      year: anime.startDate.year,
      episodes: anime.episodes,
      status: anime.status,
      genres: anime.genres,
      score: anime.averageScore,
      description: anime.description?.substring(0, 200) + "..."
    }));

    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
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
            large
          }
          bannerImage
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
          episodes
          duration
          status
          genres
          averageScore
          description(asHtml: false)
          studios {
            nodes {
              name
            }
          }
          nextAiringEpisode {
            airingAt
            timeUntilAiring
            episode
          }
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: queryGraphQL,
        variables: { id: parseInt(id) }
      })
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    const anime = data.data.Media;

    const result = {
      id: anime.id,
      title: anime.title.romaji || anime.title.english || anime.title.native,
      image: anime.coverImage.extraLarge || anime.coverImage.large,
      banner: anime.bannerImage,
      year: anime.startDate.year,
      endYear: anime.endDate?.year,
      episodes: anime.episodes,
      duration: anime.duration,
      status: anime.status,
      genres: anime.genres,
      score: anime.averageScore,
      description: anime.description,
      studios: anime.studios.nodes.map(s => s.name),
      nextEpisode: anime.nextAiringEpisode ? {
        episode: anime.nextAiringEpisode.episode,
        airingAt: anime.nextAiringEpisode.airingAt,
        timeUntilAiring: anime.nextAiringEpisode.timeUntilAiring
      } : null
    };

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao buscar detalhes: " + error.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 500
    });
  }
}

// ================== LANÇAMENTOS DA SEMANA ==================
async function handleSchedule() {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const start = Math.floor(today.getTime() / 1000);
    const end = Math.floor(tomorrow.getTime() / 1000);

    const queryGraphQL = `
      query ($start: Int, $end: Int) {
        Page(page: 1, perPage: 50) {
          airingSchedules(airingAt_greater: $start, airingAt_lesser: $end) {
            id
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

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: queryGraphQL,
        variables: { start, end }
      })
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    const results = data.data.Page.airingSchedules.map(schedule => ({
      id: schedule.media.id,
      title: schedule.media.title.romaji || schedule.media.title.english,
      image: schedule.media.coverImage.medium,
      episode: schedule.episode,
      airingAt: schedule.airingAt,
      genres: schedule.media.genres
    }));

    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao buscar lançamentos: " + error.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 500
    });
  }
}
