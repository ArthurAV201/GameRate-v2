export function getToken() {
  return localStorage.getItem('gr_token');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('gr_user'));
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getToken();
}

export function saveSession(token, nome, perfil, id) {
  localStorage.setItem('gr_token', token);
  localStorage.setItem('gr_user', JSON.stringify({ id, nome, perfil }));
}

export function clearSession() {
  localStorage.removeItem('gr_token');
  localStorage.removeItem('gr_user');
}
