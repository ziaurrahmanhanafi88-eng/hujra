/* =========================================================
   حجره — client-side logic
   Persistence: localStorage (no backend). Keys:
     hujra_users    -> [{name, email, password, provider}]
     hujra_session  -> email of the logged-in user
     hujra_posts    -> [{id, email, name, text, image, likes:[email], createdAt}]
   ========================================================= */

const LS_USERS = 'hujra_users';
const LS_SESSION = 'hujra_session';
const LS_POSTS = 'hujra_posts';

const $ = (id) => document.getElementById(id);

function getUsers(){ return JSON.parse(localStorage.getItem(LS_USERS) || '[]'); }
function saveUsers(u){ localStorage.setItem(LS_USERS, JSON.stringify(u)); }
function getPosts(){ return JSON.parse(localStorage.getItem(LS_POSTS) || '[]'); }
function savePosts(p){ localStorage.setItem(LS_POSTS, JSON.stringify(p)); }
function getSession(){ return localStorage.getItem(LS_SESSION); }
function setSession(email){ localStorage.setItem(LS_SESSION, email); }
function clearSession(){ localStorage.removeItem(LS_SESSION); }

function findUser(email){
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

function initials(name){
  return (name || '?').trim().slice(0,1).toUpperCase();
}

function timeAgo(ts){
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'همدا اوس';
  if (diff < 3600) return `${Math.floor(diff/60)} دقیقې مخکې`;
  if (diff < 86400) return `${Math.floor(diff/3600)} ساعته مخکې`;
  return `${Math.floor(diff/86400)} ورځې مخکې`;
}

/* ---------------- view switching ---------------- */
function showAuth(){
  $('authView').classList.remove('hidden');
  $('feedView').classList.add('hidden');
  $('profileView').classList.add('hidden');
}
function showFeed(){
  $('authView').classList.add('hidden');
  $('feedView').classList.remove('hidden');
  $('profileView').classList.add('hidden');
  renderFeed();
}
function showProfile(){
  $('authView').classList.add('hidden');
  $('feedView').classList.add('hidden');
  $('profileView').classList.remove('hidden');
  renderProfile();
}

/* ---------------- auth tabs ---------------- */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.tab + 'Form').classList.add('active');
  });
});

/* ---------------- signup ---------------- */
$('signupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('signupName').value.trim();
  const email = $('signupEmail').value.trim();
  const password = $('signupPassword').value;
  const errEl = $('signupError');
  errEl.textContent = '';

  if (findUser(email)){
    errEl.textContent = 'دا بریښنالیک مخکې ثبت شوی — ننوتل وکړئ.';
    return;
  }
  const users = getUsers();
  users.push({ name, email, password, provider: 'local' });
  saveUsers(users);
  setSession(email);
  boot();
});

/* ---------------- login ---------------- */
$('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const errEl = $('loginError');
  errEl.textContent = '';

  const user = findUser(email);
  if (!user || user.password !== password){
    errEl.textContent = 'بریښنالیک یا پټنوم سم نه دی.';
    return;
  }
  setSession(email);
  boot();
});

/* ---------------- logout ---------------- */
function doLogout(){ clearSession(); boot(); }
$('logoutBtn').addEventListener('click', doLogout);
$('logoutBtn2').addEventListener('click', doLogout);

/* ---------------- nav ---------------- */
$('navFeedBtn').addEventListener('click', showFeed);
$('navProfileBtn').addEventListener('click', showProfile);
$('navFeedBtn2').addEventListener('click', showFeed);
$('navProfileBtn2').addEventListener('click', showProfile);

/* ---------------- Google Sign-In ---------------- */
function decodeJwt(token){
  try{
    const payload = token.split('.')[1];
    const json = decodeURIComponent(atob(payload.replace(/-/g,'+').replace(/_/g,'/'))
      .split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(json);
  }catch(e){ return null; }
}

window.handleGoogleCredential = function(response){
  const data = decodeJwt(response.credential);
  if (!data || !data.email) return;
  let user = findUser(data.email);
  if (!user){
    const users = getUsers();
    user = { name: data.name || data.email.split('@')[0], email: data.email, password: null, provider: 'google' };
    users.push(user);
    saveUsers(users);
  }
  setSession(user.email);
  boot();
};

function initGoogleButton(){
  if (typeof GOOGLE_CLIENT_ID === 'undefined' || !GOOGLE_CLIENT_ID || typeof google === 'undefined'){
    return; // no client id configured yet — the local email/password flow still works fully
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: window.handleGoogleCredential
  });
  google.accounts.id.renderButton($('googleBtnHolder'), {
    theme: 'filled_black', shape: 'pill', text: 'continue_with', locale: 'en'
  });
}

/* ---------------- composer: image handling ---------------- */
let pendingImage = null; // compressed base64 data URL

$('imageInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 900;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      pendingImage = canvas.toDataURL('image/jpeg', 0.72);
      $('imagePreview').src = pendingImage;
      $('imagePreviewWrap').classList.remove('hidden');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

$('removeImageBtn').addEventListener('click', () => {
  pendingImage = null;
  $('imageInput').value = '';
  $('imagePreviewWrap').classList.add('hidden');
});

/* ---------------- create post ---------------- */
$('submitPostBtn').addEventListener('click', () => {
  const text = $('postText').value.trim();
  if (!text && !pendingImage) return;

  const email = getSession();
  const user = findUser(email);
  const posts = getPosts();
  posts.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    email: user.email,
    name: user.name,
    text,
    image: pendingImage,
    likes: [],
    createdAt: Date.now()
  });
  savePosts(posts);

  $('postText').value = '';
  pendingImage = null;
  $('imageInput').value = '';
  $('imagePreviewWrap').classList.add('hidden');

  renderFeed();
});

/* ---------------- rendering ---------------- */
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function postCardHtml(post, currentEmail){
  const liked = post.likes.includes(currentEmail);
  return `
    <article class="post-card" data-id="${post.id}">
      <div class="post-head">
        <div class="avatar">${initials(post.name)}</div>
        <div>
          <div class="post-author">${escapeHtml(post.name)}</div>
          <div class="post-time">${timeAgo(post.createdAt)}</div>
        </div>
      </div>
      ${post.text ? `<div class="post-text">${escapeHtml(post.text)}</div>` : ''}
      ${post.image ? `<img class="post-image" src="${post.image}" alt="عکس">` : ''}
      <div class="post-foot">
        <button class="like-btn ${liked ? 'liked' : ''}" data-id="${post.id}">
          <span class="flame">🔥</span>
          <span class="like-count">${post.likes.length}</span>
          <span>${liked ? 'خوښ شو' : 'خوښول'}</span>
        </button>
      </div>
    </article>`;
}

function attachLikeHandlers(container){
  container.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const email = getSession();
      const posts = getPosts();
      const post = posts.find(p => p.id === id);
      if (!post) return;
      const idx = post.likes.indexOf(email);
      if (idx >= 0) post.likes.splice(idx,1); else post.likes.push(email);
      savePosts(posts);
      renderFeed();
      if (!$('profileView').classList.contains('hidden')) renderProfile();
    });
  });
}

function renderFeed(){
  const email = getSession();
  const user = findUser(email);
  $('topUserName').textContent = user.name;
  $('composerAvatar').textContent = initials(user.name);

  const posts = getPosts();
  const listEl = $('feedList');
  listEl.innerHTML = posts.map(p => postCardHtml(p, email)).join('');
  $('emptyFeedMsg').classList.toggle('hidden', posts.length > 0);
  attachLikeHandlers(listEl);
}

function renderProfile(){
  const email = getSession();
  const user = findUser(email);
  $('topUserName2').textContent = user.name;
  $('profileAvatar').textContent = initials(user.name);
  $('profileName').textContent = user.name;
  $('profileEmail').textContent = user.email;

  const posts = getPosts().filter(p => p.email === email);
  const listEl = $('profileList');
  listEl.innerHTML = posts.map(p => postCardHtml(p, email)).join('');
  $('emptyProfileMsg').classList.toggle('hidden', posts.length > 0);
  attachLikeHandlers(listEl);
}

/* ---------------- boot ---------------- */
function boot(){
  const email = getSession();
  if (email && findUser(email)){
    showFeed();
  } else {
    clearSession();
    showAuth();
  }
}

initGoogleButton();
boot();
