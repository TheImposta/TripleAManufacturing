// public/js/reset-password.js
import { supabase } from './supabase.js';

const messageEl = document.getElementById('message');
const form = document.getElementById('reset-form');
const updateBtn = document.getElementById('updatePasswordBtn');
const passwordInput = document.getElementById('new-password');

function parseTokenFromUrl() {
  // Supabase sometimes returns tokens in the hash (#access_token=...) or query (?access_token=...)
  const hash = window.location.hash ? window.location.hash.substring(1) : '';
  const qs = window.location.search ? window.location.search.substring(1) : '';
  const params = new URLSearchParams(hash || qs);
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type')
  };
}

async function init() {
  messageEl.style.color = 'var(--black)';
  messageEl.innerText = 'Verifying reset link...';

  const token = parseTokenFromUrl();

  if (!token.access_token) {
    // No token in URL
    messageEl.innerText = 'No reset token found. Please request a new password reset link.';
    return;
  }

  // Try to set session with the recovery token
  try {
    const { error: setError } = await supabase.auth.setSession({
      access_token: token.access_token,
      refresh_token: token.refresh_token
    });

    if (setError) {
      console.error('setSession error', setError);
      messageEl.innerText = 'Invalid or expired link. Please request a new password reset link.';
      return;
    }

    // Session established — show form
    messageEl.innerText = 'Link verified. Enter a new password below.';
    form.style.display = 'block';
  } catch (err) {
    console.error(err);
    messageEl.innerText = 'An unexpected error occurred. Please try again.';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = passwordInput.value.trim();

  if (!newPassword || newPassword.length < 8) {
    messageEl.style.color = '#ff3b30';
    messageEl.innerText = 'Password must be at least 8 characters.';
    return;
  }

  updateBtn.disabled = true;
  updateBtn.innerText = 'Updating...';

  try {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error('updateUser error', error);
      messageEl.style.color = '#ff3b30';
      messageEl.innerText = error.message || 'Failed to update password.';
      updateBtn.disabled = false;
      updateBtn.innerText = 'Update Password';
      return;
    }

    messageEl.style.color = 'var(--blue)';
    messageEl.innerText = 'Password updated. Redirecting to sign in...';
    setTimeout(() => {
      // Clear session and send back to sign-in page
      supabase.auth.signOut().then(() => {
        window.location.href = 'auth.html';
      });
    }, 1300);
  } catch (err) {
    console.error(err);
    messageEl.style.color = '#ff3b30';
    messageEl.innerText = 'An unexpected error occurred.';
    updateBtn.disabled = false;
    updateBtn.innerText = 'Update Password';
  }
});

// Kick off verification when script loads
init();
