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

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: queryGraphQL })
    });

    const data = await response.json();
    const results = data.data.Page.media.map(anime => ({
      id: anime.id,
      title: anime.title.romaji || anime.title.english,
      image: anime.coverImage.large,
      year: anime.startDate.year,
      score: anime.averageScore
    }));

    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao buscar destaques: " + error.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 500
    });
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

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: queryGraphQL })
    });

    const data = await response.json();
    const results = data.data.Page.media.map(anime => ({
      id: anime.id,
      title: anime.title.romaji || anime.title.english,
      image: anime.coverImage.large,
      year: anime.startDate.year,
      score: anime.averageScore
    }));

    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao buscar populares: " + error.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 500
    });
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

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: queryGraphQL })
    });

    const data = await response.json();
    const results = data.data.Page.media.map(anime => ({
      id: anime.id,
      title: anime.title.romaji || anime.title.english,
      image: anime.coverImage.large,
      year: anime.startDate.year,
      score: anime.averageScore
    }));

    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao buscar sugestões: " + error.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 500
    });
  }
}
