const seedUrl = new URL('../data/seed.json', import.meta.url);
const SEED    = await fetch(seedUrl).then(r => r.json());

function lsGet(key) {
  const val = localStorage.getItem('gr_' + key);
  if (val === null) {
    localStorage.setItem('gr_' + key, JSON.stringify(SEED[key] ?? []));
    return JSON.parse(JSON.stringify(SEED[key] ?? []));
  }
  return JSON.parse(val);
}
function lsSet(key, val) { localStorage.setItem('gr_' + key, JSON.stringify(val)); }
function nextId(arr, field) { return arr.length ? Math.max(...arr.map(x => x[field])) + 1 : 1; }

export const db = {
  getGames()    { return lsGet('games');    },
  setGames(v)   { lsSet('games', v);       },
  nextGameId()  { return nextId(this.getGames(), 'id_jogo'); },
  getGame(id)   { return this.getGames().find(g => g.id_jogo === parseInt(id)) || null; },

  getUsers()    { return lsGet('users');    },
  setUsers(v)   { lsSet('users', v);       },
  nextUserId()  { return nextId(this.getUsers(), 'id_usuario'); },
  getUser(id)   { return this.getUsers().find(u => u.id_usuario === parseInt(id)) || null; },

  getReviews()  { return lsGet('reviews');  },
  setReviews(v) { lsSet('reviews', v);     },
  nextReviewId(){ return nextId(this.getReviews(), 'id_avaliacao'); },

  getComments() { return lsGet('comments'); },
  setComments(v){ lsSet('comments', v);    },
  nextCommentId(){ return nextId(this.getComments(), 'id_comentario'); },

  getLikes()    { return lsGet('likes');    },
  setLikes(v)   { lsSet('likes', v);       },

  getContacts() { return lsGet('contacts') || []; },
  setContacts(v){ lsSet('contacts', v);    },
  nextContactId(){ return nextId(this.getContacts(), 'id_comunicacao'); },

  getFavorites()   { return lsGet('favorites') || []; },
  setFavorites(v)  { lsSet('favorites', v);           },

  getGenres()   { return SEED.genres;    },
  getPlatforms(){ return SEED.platforms; },

  updateGameAverage(jogoId) {
    const id      = parseInt(jogoId);
    const reviews = this.getReviews().filter(r => r.id_jogo_fk === id);
    const games   = this.getGames();
    const idx     = games.findIndex(g => g.id_jogo === id);
    if (idx === -1) return;
    if (!reviews.length) {
      games[idx].nota_media = null; games[idx].total_avaliacoes = 0;
    } else {
      const avg = reviews.reduce((s, r) => s + parseFloat(r.nota), 0) / reviews.length;
      games[idx].nota_media = parseFloat(avg.toFixed(1));
      games[idx].total_avaliacoes = reviews.length;
    }
    this.setGames(games);
  }
};
