/* ═══════════════════════════════════════════
   摄影日记 — 登录页逻辑
   ═══════════════════════════════════════════ */

const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('errorMsg');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.classList.remove('show');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value })
    });

    if (res.ok) {
      // 登录成功，跳转到管理页
      window.location.href = '/admin.html';
    } else {
      const data = await res.json();
      errorMsg.textContent = data.error || '密码错误';
      errorMsg.classList.add('show');
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (err) {
    errorMsg.textContent = '网络错误，请重试';
    errorMsg.classList.add('show');
  }
});
