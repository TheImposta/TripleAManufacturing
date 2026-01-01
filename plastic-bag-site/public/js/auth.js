// public/js/auth.js
import { supabase } from './supabase.js';

/**
 * Profile workflow:
 * - On sign up: create a row in `profiles` with email, full_name, phone (user_id may be null until confirmed).
 * - On sign in: link any existing profile rows by email (update user_id).
 * - Profiles table is used for admin contact info and for customer contact storage.
 *
 * Required DB table (run migrations included in migrations.sql):
 * - profiles (id, user_id, email, full_name, phone, is_admin boolean, contact_email, contact_phone)
 */

const messageEl = document.getElementById('message');
const authLinkInNav = document.getElementById('auth-link');

export async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();

  if (authLinkInNav) {
    if (user) {
      // try to detect admin more reliably after login by checking profiles or metadata
      let isAdmin = false;
      try {
        const { data: profiles } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).limit(1);
        if (profiles && profiles.length > 0 && profiles[0].is_admin) isAdmin = true;
      } catch (e) {
        // fallback to metadata/email
        isAdmin = user.email && user.email.includes('admin');
      }

      authLinkInNav.innerHTML = `
        ${isAdmin ? '<a href="admin.html">Admin Portal</a>' : ''}
        <a href="#" id="signOutBtn">Sign Out</a>
      `;

      const signOutBtn = document.getElementById('signOutBtn');
      if (signOutBtn) {
        signOutBtn.onclick = async (e) => {
          e.preventDefault();
          await supabase.auth.signOut();
          window.location.href = 'index.html';
        };
      }
    } else {
      // default link
      authLinkInNav.innerText = 'Sign In';
      authLinkInNav.href = 'auth.html';
    }
  }

  // If user signed in, link profile rows by email (useful when sign-up created profiles before confirm)
  if (user) {
    try {
      await supabase.from('profiles').update({ user_id: user.id }).eq('email', user.email);
    } catch (e) {
      // ignore
      console.warn('profile linking failed', e);
    }
  }

  return user;
}

// UI wiring
const signInBtn = document.getElementById('signInBtn');
const showSignUpBtn = document.getElementById('showSignUpBtn');
const signUpBtn = document.getElementById('signUpBtn');
const sendResetBtn = document.getElementById('sendResetBtn');
const showForgot = document.getElementById('showForgot');
const showLogin = document.getElementById('showLogin');
const showLoginFromForgot = document.getElementById('showLoginFromForgot');
const showSignUpFromLogin = document.getElementById('showSignUpBtn');

const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const forgotView = document.getElementById('forgot-view');

if (showSignUpBtn) {
  showSignUpBtn.onclick = () => {
    loginView.style.display = 'none';
    signupView.style.display = 'block';
    forgotView.style.display = 'none';
    messageEl.innerText = '';
  };
}
if (showLogin) {
  showLogin.onclick = () => {
    loginView.style.display = 'block';
    signupView.style.display = 'none';
    forgotView.style.display = 'none';
    messageEl.innerText = '';
  };
}
if (showLoginFromForgot) {
  showLoginFromForgot.onclick = () => {
    loginView.style.display = 'block';
    signupView.style.display = 'none';
    forgotView.style.display = 'none';
    messageEl.innerText = '';
  };
}
if (showForgot) {
  showForgot.onclick = (e) => {
    e.preventDefault();
    loginView.style.display = 'none';
    signupView.style.display = 'none';
    forgotView.style.display = 'block';
    messageEl.innerText = '';
  };
}

// Sign in
if (signInBtn) {
  signInBtn.onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) {
      messageEl.innerText = 'Please enter both email and password.';
      return;
    }

    signInBtn.innerText = 'Signing in...';
    signInBtn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      messageEl.style.color = '#ff3b30';
      messageEl.innerText = error.message;
      signInBtn.innerText = 'Sign In';
      signInBtn.disabled = false;
    } else {
      // After sign-in, ensure profile linkage before redirect
      await checkUser();
      window.location.href = 'products.html';
    }
  };
}

// Sign up
if (signUpBtn) {
  signUpBtn.onclick = async () => {
    const fullName = document.getElementById('signup-name').value;
    const phone = document.getElementById('signup-phone').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (!email || !password || !fullName) {
      messageEl.innerText = 'Please provide name, email and password.';
      return;
    }

    signUpBtn.innerText = 'Creating account...';
    signUpBtn.disabled = true;

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      messageEl.style.color = '#ff3b30';
      messageEl.innerText = error.message;
      signUpBtn.innerText = 'Create Business Account';
      signUpBtn.disabled = false;
      return;
    }

    // Create or upsert a profile row with email and contact info.
    const { error: insertErr } = await supabase.from('profiles').upsert({
      email: email,
      full_name: fullName,
      phone: phone
      // Admin status is managed manually in Supabase
    }, { onConflict: 'email' });

    if (insertErr) {
      console.warn('failed to insert profile', insertErr);
    }

    messageEl.style.color = 'var(--blue)';
    messageEl.innerText = 'Success! Check your email to confirm your account. After confirming, sign in to complete profile.';
    signUpBtn.innerText = 'Account Created';
  };
}

// Password reset
if (sendResetBtn) {
  sendResetBtn.onclick = async () => {
    const email = document.getElementById('forgot-email').value;
    if (!email) {
      messageEl.innerText = 'Please enter your email address.';
      return;
    }

    sendResetBtn.innerText = 'Sending...';
    sendResetBtn.disabled = true;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`,
    });

    if (error) {
      messageEl.style.color = '#ff3b30';
      messageEl.innerText = error.message;
      sendResetBtn.innerText = 'Send Reset Link';
      sendResetBtn.disabled = false;
    } else {
      messageEl.style.color = 'var(--blue)';
      messageEl.innerText = 'Recovery link sent! Please check your email.';
      sendResetBtn.innerText = 'Link Sent';
    }
  };
}

// On load, populate nav based on auth state
checkUser();
