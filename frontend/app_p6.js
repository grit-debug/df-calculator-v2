
function setResult(key, val){
  document.getElementById('res-' + key + '-usd').textContent = fmtUSD(val);
  document.getElementById('res-' + key + '-try').textContent = fmtTRY(val);
  document.getElementById('sum-' + key + '-usd').textContent = fmtUSDsum(val);
  document.getElementById('sum-' + key + '-try').textContent = fmtTRY(val);
}

const API = window.location.origin;

const token = localStorage.getItem('df_token');
if (!token) { window.location.href = '/login.html'; }
document.getElementById('header-user-ad').textContent =
  localStorage.getItem('df_ad') || '';

function authHeaders() {
  return { 'Content-Type': 'application/json',
           'Authorization': 'Bearer ' + localStorage.getItem('df_token') };
}

function cikisYap() {
  localStorage.removeItem('df_token');
  localStorage.removeItem('df_ad');
  window.location.href = '/login.html';
}

async function kullaniciPaneliAc() {
  document.getElementById('kullanici-modal').classList.add('open');
  await kullanicilariYukle();
}

function kullaniciPaneliKapat() {
  document.getElementById('kullanici-modal').classList.remove('open');
  ['yeni-ad','yeni-email','yeni-sifre'].forEach(id => document.getElementById(id).value = '');
  const err = document.getElementById('kullanici-error');
  err.style.display = 'none';
}

async function kullanicilariYukle() {
  try {
    const res = await fetch(`${API}/api/kullanicilar`, { headers: authHeaders() });
    const liste = await res.json();
    const el = document.getElementById('kullanici-listesi');
    el.innerHTML = liste.map(u => `
      <div class="user-row">
        <div>
          <div style="font-weight:600;color:var(--text)">${u.ad}</div>
          <div style="font-size:12px;color:var(--text-muted)">${u.email}</div>
        </div>
      </div>`).join('');
  } catch(e) { console.error(e); }
}