import { db } from './db.js';
import { getUser } from './auth.js';

function currentUserId() {
  const data = getUser();
  if (!data) throw new Error('Não autenticado');
  return parseInt(data.id);
}

function requireAdmin() {
  const data = getUser();
  if (!data || data.perfil !== 'Administrador')
    throw new Error('Acesso restrito a administradores');
}

function route(method, path, body) {
  const [base, qs] = path.split('?');
  const params     = new URLSearchParams(qs || '');
  const parts      = base.replace(/^\//, '').split('/');

  if (method === 'GET' && parts[0] === 'jogos' && parts[1] === 'stats') {
    return {
      total_jogos:    db.getGames().length,
      total_aval:     db.getReviews().length,
      total_usuarios: db.getUsers().length,
      total_plat:     db.getPlatforms().length
    };
  }


  if (method === 'GET' && parts[0] === 'jogos' && parts[1] === 'destaques') {
    const games = db.getGames();
    return {
      lancamentos: [...games].sort((a,b) => new Date(b.data_lancamento)-new Date(a.data_lancamento)).slice(0,12),
      melhores:    [...games].filter(g=>g.nota_media).sort((a,b)=>b.nota_media-a.nota_media).slice(0,12)
    };
  }

  if (method === 'GET' && parts[0] === 'jogos' && parts[1] && !isNaN(parts[1])) {
    const game = db.getGame(parts[1]);
    if (!game) throw new Error('Jogo não encontrado');
    return {
      ...game,
      generos:    (game.generos    || []).map(n => ({ nome_genero: n })),
      plataformas:(game.plataformas|| []).map(n => ({ nome_plataforma: n }))
    };
  }

  if (method === 'GET' && parts[0] === 'jogos' && !parts[1]) {
    let games      = db.getGames();
    const search   = params.get('search')    || '';
    const genero   = params.get('genero')    || '';
    const plat     = params.get('plataforma')|| '';
    const ordem    = params.get('ordem')     || 'nota_media';
    const dir      = params.get('dir')       || 'DESC';
    const page     = parseInt(params.get('page'))  || 1;
    const limit    = parseInt(params.get('limit')) || 20;

    if (search) games = games.filter(g =>
      g.nome_jogo.toLowerCase().includes(search.toLowerCase()) ||
      g.desenvolvedora.toLowerCase().includes(search.toLowerCase())
    );
    if (genero) games = games.filter(g => (g.generos    || []).includes(genero));
    if (plat)   games = games.filter(g => (g.plataformas|| []).includes(plat));

    games = games.sort((a, b) => {
      let va = a[ordem] ?? ''; let vb = b[ordem] ?? '';
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      return dir === 'DESC' ? (va < vb ? 1 : va > vb ? -1 : 0)
                            : (va > vb ? 1 : va < vb ? -1 : 0);
    });

    const total = games.length;
    return { total, jogos: games.slice((page-1)*limit, page*limit) };
  }

  if (method === 'POST' && parts[0] === 'jogos' && !parts[1]) {
    requireAdmin();
    const { nome_jogo, desenvolvedora, data_lancamento, descricao, capa, generos, plataformas } = body;
    if (!nome_jogo || !desenvolvedora || !data_lancamento || !descricao)
      throw new Error('Preencha todos os campos obrigatórios');

    const games   = db.getGames();
    const newGame = {
      id_jogo: db.nextGameId(),
      nome_jogo, desenvolvedora, data_lancamento, descricao,
      capa: capa || null,
      nota_media: null, total_avaliacoes: 0,
      generos: generos || [], plataformas: plataformas || []
    };
    games.push(newGame);
    db.setGames(games);
    return newGame;
  }

  if (method === 'DELETE' && parts[0] === 'jogos' && parts[1]) {
    requireAdmin();
    const id = parseInt(parts[1]);
    db.setGames(db.getGames().filter(g => g.id_jogo !== id));
    db.setReviews(db.getReviews().filter(r => r.id_jogo_fk !== id));
    return { ok: true };
  }


  if (method === 'GET' && parts[0] === 'generos') {
    const games = db.getGames();
    return db.getGenres()
      .map(g => ({ nome_genero: g, total_jogos: games.filter(j=>(j.generos||[]).includes(g)).length }))
      .filter(g => g.total_jogos > 0);
  }

  if (method === 'GET' && parts[0] === 'plataformas') {
    return db.getPlatforms().map(p => ({ nome_plataforma: p }));
  }

  if (method === 'POST' && parts[0] === 'auth' && parts[1] === 'login') {
    const { email, senha } = body;
    const user = db.getUsers().find(u =>
      (u.email === email || u.nome_usuario === email) && u.senha === senha
    );
    if (!user) throw new Error('E-mail/usuário ou senha incorretos');
    const token = btoa(JSON.stringify({ id: user.id_usuario, ts: Date.now() }));
    return { token, nome: user.nome_usuario, perfil: user.nome_perfil, id: user.id_usuario };
  }

  if (method === 'POST' && parts[0] === 'auth' && parts[1] === 'cadastro') {
    const { nome_usuario, email, senha, perfil_escolhido } = body;
    if (!nome_usuario || !email || !senha) throw new Error('Preencha todos os campos');
    if (senha.length < 6) throw new Error('Senha deve ter no mínimo 6 caracteres');
    const users = db.getUsers();
    if (users.find(u => u.email === email))           throw new Error('E-mail já cadastrado');
    if (users.find(u => u.nome_usuario.toLowerCase() === nome_usuario.toLowerCase()))
      throw new Error('Nome de usuário já em uso');

    const perfisValidos = ['Jogador', 'Crítico Especializado'];
    const nome_perfil   = perfisValidos.includes(perfil_escolhido) ? perfil_escolhido : 'Jogador';
    const newUser = {
      id_usuario: db.nextUserId(), nome_usuario, email, senha,
      nome_perfil, data_criacao: new Date().toISOString().split('T')[0]
    };
    users.push(newUser);
    db.setUsers(users);
    const token = btoa(JSON.stringify({ id: newUser.id_usuario, ts: Date.now() }));
    return { token, nome: newUser.nome_usuario, perfil: newUser.nome_perfil, id: newUser.id_usuario };
  }

  if (method === 'GET' && parts[0] === 'usuarios' && !parts[1]) {
    requireAdmin();
    return db.getUsers().map(({ senha: _, ...u }) => u); // não expõe senha
  }

  if (method === 'GET' && parts[0] === 'usuarios' && parts[1] === 'me' && !parts[2]) {
    const uid  = currentUserId();
    const user = db.getUsers().find(u => u.id_usuario === uid);
    if (!user) throw new Error('Sessão inválida');
    const myRevs = db.getReviews().filter(r => r.id_usuario_fk === uid);
    return { ...user, total_avaliacoes: myRevs.length, total_seguidores: 0, total_seguindo: 0 };
  }

  if (method === 'PUT' && parts[0] === 'usuarios' && parts[1] === 'me') {
    const uid   = currentUserId();
    const users = db.getUsers();
    const idx   = users.findIndex(u => u.id_usuario === uid);
    if (idx === -1) throw new Error('Usuário não encontrado');
    const { nome_usuario, email, senha, perfil_escolhido } = body;
    if (nome_usuario) users[idx].nome_usuario = nome_usuario;
    if (email)        users[idx].email        = email;
    if (senha)        users[idx].senha        = senha;
    db.setUsers(users);
    return { ok: true };
  }

  if (method === 'DELETE' && parts[0] === 'usuarios' && parts[1]) {
    requireAdmin();
    const id = parseInt(parts[1]);
    db.setUsers(db.getUsers().filter(u => u.id_usuario !== id));
    db.setReviews(db.getReviews().filter(r => r.id_usuario_fk !== id));
    return { ok: true };
  }

  if (method === 'GET' && parts[0] === 'usuarios' && parts[1] === 'me' && parts[2] === 'avaliacoes') {
    const uid   = currentUserId();
    const likes = db.getLikes();
    return db.getReviews()
      .filter(r => r.id_usuario_fk === uid)
      .map(r => {
        const game  = db.getGame(r.id_jogo_fk) || {};
        const lkCnt = likes.filter(l => l.id_avaliacao_fk === r.id_avaliacao).length + (r.total_curtidas || 0);
        return { ...r, nome_jogo: game.nome_jogo, capa: game.capa, total_curtidas: lkCnt };
      })
      .sort((a,b) => new Date(b.data_publicacao) - new Date(a.data_publicacao));
  }

  if (method === 'GET' && parts[0] === 'usuarios' && parts[1] === 'me' && parts[2] === 'notificacoes') {
    const uid      = currentUserId();
    const myRevIds = db.getReviews().filter(r => r.id_usuario_fk === uid).map(r => r.id_avaliacao);
    return db.getComments()
      .filter(c => myRevIds.includes(c.id_avaliacao_fk) && c.id_usuario_fk !== uid)
      .map(c => {
        const cu = db.getUser(c.id_usuario_fk) || {};
        return { id_notificacao: c.id_comentario, titulo: `@${cu.nome_usuario || '?'} comentou na sua avaliação`, mensagem: c.texto, data_envio: c.data_comentario, lido: true };
      }).reverse();
  }

  if (method === 'GET' && parts[0] === 'avaliacoes' && parts[1] === 'destaque') {
    const likes = db.getLikes();
    return db.getReviews()
      .map(r => {
        const game = db.getGame(r.id_jogo_fk) || {};
        const user = db.getUser(r.id_usuario_fk) || {};
        const lkCnt = likes.filter(l => l.id_avaliacao_fk === r.id_avaliacao).length + (r.total_curtidas || 0);
        return { ...r, nome_jogo: game.nome_jogo, capa: game.capa, nome_usuario: user.nome_usuario, nome_perfil: user.nome_perfil, total_curtidas: lkCnt };
      })
      .sort((a,b) => b.total_curtidas - a.total_curtidas)
      .slice(0,6);
  }

  if (method === 'GET' && parts[0] === 'avaliacoes' && parts[1] && !isNaN(parts[1])) {
    const id  = parseInt(parts[1]);
    const rev = db.getReviews().find(r => r.id_avaliacao === id);
    if (!rev) throw new Error('Avaliação não encontrada');

    const game  = db.getGame(rev.id_jogo_fk)    || {};
    const user  = db.getUser(rev.id_usuario_fk)  || {};
    const likes = db.getLikes();
    const lkCnt = likes.filter(l => l.id_avaliacao_fk === id).length + (rev.total_curtidas || 0);

    const comentarios = db.getComments()
      .filter(c => c.id_avaliacao_fk === id)
      .map(c => ({ ...c, nome_usuario: (db.getUser(c.id_usuario_fk) || {}).nome_usuario }));

    return { ...rev, nome_jogo: game.nome_jogo, capa: game.capa, nome_usuario: user.nome_usuario, nome_perfil: user.nome_perfil, total_curtidas: lkCnt, comentarios };
  }

  if (method === 'GET' && parts[0] === 'avaliacoes' && !parts[1]) {
    const jogoId = params.get('jogo_id') ? parseInt(params.get('jogo_id')) : null;
    const limit  = parseInt(params.get('limit')) || 20;
    const likes  = db.getLikes();
    const coms   = db.getComments();

    let revs = db.getReviews();
    if (jogoId) revs = revs.filter(r => r.id_jogo_fk === jogoId);
    revs = revs.sort((a,b) => new Date(b.data_publicacao) - new Date(a.data_publicacao));

    const total = revs.length;
    return {
      total,
      avaliacoes: revs.slice(0,limit).map(r => {
        const game  = db.getGame(r.id_jogo_fk)   || {};
        const user  = db.getUser(r.id_usuario_fk) || {};
        const lkCnt = likes.filter(l => l.id_avaliacao_fk === r.id_avaliacao).length + (r.total_curtidas||0);
        const cmCnt = coms.filter(c => c.id_avaliacao_fk === r.id_avaliacao).length;
        return { ...r, nome_jogo: game.nome_jogo, capa: game.capa, nome_usuario: user.nome_usuario, nome_perfil: user.nome_perfil, total_curtidas: lkCnt, total_comentarios: cmCnt };
      })
    };
  }

  if (method === 'POST' && parts[0] === 'avaliacoes' && !parts[1]) {
    const uid = currentUserId();
    const { id_jogo_fk, nota, titulo, texto } = body;
    if (!titulo || !texto)   throw new Error('Preencha todos os campos');
    if (texto.length < 40)   throw new Error('Texto deve ter no mínimo 40 caracteres');
    if (db.getReviews().find(r => r.id_usuario_fk === uid && r.id_jogo_fk === id_jogo_fk))
      throw new Error('Você já avaliou este jogo');

    const newRev = {
      id_avaliacao: db.nextReviewId(), id_usuario_fk: uid, id_jogo_fk,
      nota: parseFloat(nota), titulo, texto,
      data_publicacao: new Date().toISOString().split('T')[0], total_curtidas: 0
    };
    const revs = db.getReviews();
    revs.push(newRev);
    db.setReviews(revs);
    db.updateGameAverage(id_jogo_fk);
    return newRev;
  }

  if (method === 'DELETE' && parts[0] === 'avaliacoes' && parts[1]) {
    const uid = currentUserId();
    const id  = parseInt(parts[1]);
    const rev = db.getReviews().find(r => r.id_avaliacao === id);
    if (!rev) throw new Error('Avaliação não encontrada');
    const user = db.getUser(uid);
    if (rev.id_usuario_fk !== uid && user?.nome_perfil !== 'Administrador')
      throw new Error('Sem permissão');
    db.setReviews(db.getReviews().filter(r => r.id_avaliacao !== id));
    db.updateGameAverage(rev.id_jogo_fk);
    return { ok: true };
  }

  if (method === 'POST' && parts[0] === 'avaliacoes' && parts[2] === 'curtir') {
    const uid   = currentUserId();
    const id    = parseInt(parts[1]);
    const likes = db.getLikes();
    const idx   = likes.findIndex(l => l.id_avaliacao_fk === id && l.id_usuario_fk === uid);
    if (idx === -1) { likes.push({ id_avaliacao_fk: id, id_usuario_fk: uid }); db.setLikes(likes); return { curtiu: true }; }
    else             { likes.splice(idx,1); db.setLikes(likes); return { curtiu: false }; }
  }

  if (method === 'POST' && parts[0] === 'avaliacoes' && parts[2] === 'comentar') {
    const uid    = currentUserId();
    const id     = parseInt(parts[1]);
    const { texto } = body;
    if (!texto) throw new Error('Comentário vazio');
    const newComment = {
      id_comentario: db.nextCommentId(), id_avaliacao_fk: id, id_usuario_fk: uid,
      texto, data_comentario: new Date().toISOString().split('T')[0]
    };
    const coms = db.getComments();
    coms.push(newComment);
    db.setComments(coms);
    return newComment;
  }

  if (method === 'GET' && parts[0] === 'contato') {
    requireAdmin();
    return db.getContacts();
  }

  if (method === 'POST' && parts[0] === 'contato') {
    const { email_contato, tipo, mensagem } = body;
    if (!email_contato || !tipo || !mensagem) throw new Error('Preencha todos os campos');
    const contacts = db.getContacts();
    const entry    = { id_comunicacao: db.nextContactId(), email_contato, tipo, mensagem, data_comunicacao: new Date().toISOString().split('T')[0] };
    contacts.push(entry);
    db.setContacts(contacts);
    return { ok: true };
  }

  if (method === 'GET' && parts[0] === 'usuarios' && parts[1] === 'me' && parts[2] === 'favoritos') {
    const uid  = currentUserId();
    const favs = db.getFavorites().filter(f => f.id_usuario_fk === uid);
    return favs.map(f => db.getGame(f.id_jogo_fk)).filter(Boolean);
  }

  if (method === 'POST' && parts[0] === 'usuarios' && parts[1] === 'me' && parts[2] === 'favoritos') {
    const uid    = currentUserId();
    const jogoId = parseInt(parts[3]);
    const favs   = db.getFavorites();
    const idx    = favs.findIndex(f => f.id_usuario_fk === uid && f.id_jogo_fk === jogoId);
    if (idx === -1) { favs.push({ id_usuario_fk: uid, id_jogo_fk: jogoId }); db.setFavorites(favs); return { favoritado: true }; }
    else            { favs.splice(idx, 1); db.setFavorites(favs); return { favoritado: false }; }
  }

  throw new Error(`Rota não encontrada: ${method} ${path}`);
}

export const api = {
  get:    (path)       => Promise.resolve(route('GET',    path, null)),
  post:   (path, body) => Promise.resolve(route('POST',   path, body)),
  put:    (path, body) => Promise.resolve(route('PUT',    path, body)),
  delete: (path)       => Promise.resolve(route('DELETE', path, null)),
};
