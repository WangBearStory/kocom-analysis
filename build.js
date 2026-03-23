const fs = require('fs');
const crypto = require('crypto');

// 1. Read base64 file and decode to original HTML
const b64 = fs.readFileSync(__dirname + '/kocom-content.b64', 'utf8').trim();
const originalHtml = Buffer.from(b64, 'base64').toString('utf8');

// 2. AES-256-CBC encryption (CryptoJS-compatible)
// CryptoJS uses OpenSSL-compatible key derivation (EVP_BytesToKey)
const password = process.argv[2] || 'mirero2816';
const salt = crypto.randomBytes(8);

function evpBytesToKey(password, salt, keyLen, ivLen) {
  const data = Buffer.concat([Buffer.from(password, 'utf8'), salt]);
  let hash = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  while (hash.length < keyLen + ivLen) {
    block = crypto.createHash('md5').update(Buffer.concat([block, data])).digest();
    hash = Buffer.concat([hash, block]);
  }
  return { key: hash.slice(0, keyLen), iv: hash.slice(keyLen, keyLen + ivLen) };
}

const { key, iv } = evpBytesToKey(password, salt, 32, 16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
let encrypted = cipher.update(originalHtml, 'utf8', 'base64');
encrypted += cipher.final('base64');

// OpenSSL format: "Salted__" + salt + ciphertext -> base64
const salted = Buffer.concat([
  Buffer.from('Salted__', 'ascii'),
  salt,
  Buffer.from(encrypted, 'base64')
]);
const ciphertextB64 = salted.toString('base64');

// 3. Build wrapper HTML
const wrapperHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<meta name="googlebot" content="noindex, nofollow">
<title>Protected Page</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body.locked {
    background: #1a1a2e; color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex; justify-content: center; align-items: center;
    min-height: 100vh;
  }
  .auth-box {
    background: #16213e; border: 1px solid #0f3460;
    border-radius: 12px; padding: 40px; width: 360px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    text-align: center;
  }
  .auth-box h2 { margin-bottom: 24px; font-weight: 500; color: #e0e0e0; font-size: 18px; }
  .auth-box input[type="password"] {
    width: 100%; padding: 12px 16px; border: 1px solid #0f3460;
    border-radius: 8px; background: #1a1a2e; color: #e0e0e0;
    font-size: 14px; outline: none; transition: border-color 0.2s;
  }
  .auth-box input[type="password"]:focus { border-color: #533483; }
  .auth-box button {
    width: 100%; padding: 12px; margin-top: 16px;
    background: #533483; color: #fff; border: none;
    border-radius: 8px; font-size: 14px; cursor: pointer;
    transition: background 0.2s;
  }
  .auth-box button:hover { background: #6a42a0; }
  .auth-box .error { color: #e74c3c; font-size: 13px; margin-top: 12px; display: none; }
</style>
</head>
<body class="locked">
<div class="auth-box" id="authBox">
  <h2>Access Protected</h2>
  <input type="password" id="pwInput" placeholder="Password" autofocus>
  <button id="btnDecrypt">Unlock</button>
  <div class="error" id="errMsg">Incorrect password.</div>
</div>
<script>
var ENCRYPTED = ${JSON.stringify(ciphertextB64)};

function tryDecrypt(pw) {
  try {
    var decrypted = CryptoJS.AES.decrypt(ENCRYPTED, pw);
    var text = decrypted.toString(CryptoJS.enc.Utf8);
    if (!text || text.length < 10) return null;
    return text;
  } catch(e) { return null; }
}

function renderDecrypted(html) {
  document.documentElement.innerHTML = '';
  document.open();
  document.write(html);
  document.close();
}

function attemptUnlock(pw) {
  var result = tryDecrypt(pw);
  if (result) {
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }
    setTimeout(function() { renderDecrypted(result); }, 0);
    return true;
  }
  return false;
}

window.addEventListener('DOMContentLoaded', function() {
  var hash = window.location.hash.substring(1);
  if (hash && attemptUnlock(decodeURIComponent(hash))) return;

  document.getElementById('btnDecrypt').addEventListener('click', function() {
    var pw = document.getElementById('pwInput').value;
    if (!attemptUnlock(pw)) {
      document.getElementById('errMsg').style.display = 'block';
    }
  });
  document.getElementById('pwInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('btnDecrypt').click();
  });
});
</script>
</body>
</html>`;

fs.writeFileSync('C:/Workspace/kocom-analysis/index.html', wrapperHtml, 'utf8');
console.log('Done. Encrypted content length:', ciphertextB64.length);
console.log('Output: C:/Workspace/kocom-analysis/index.html');
