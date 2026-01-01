import { supabase } from "./supabase.js";

// Check if user is logged in and update UI
export async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  const authLink = document.getElementById('auth-link');
  
  if (authLink) {
    if (user) {
      const isAdmin = user.email.includes('admin') || (user.user_metadata && user.user_metadata.is_admin === true); 
      
      authLink.innerHTML = `
        <div style="display: flex; gap: 24px; align-items: center;">
          ${isAdmin ? '<a href="admin.html" style="font-weight: 600; color: var(--blue);">Admin Portal</a>' : ''}
          <a href="#" id="signOutBtn">Sign Out</a>
        </div>
      `;
      
      document.getElementById('signOutBtn').onclick = async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = "index.html";
      };
    } else {
      authLink.innerText = "Sign In";
      authLink.href = "auth.html";
      authLink.onclick = null;
    }
  }
  return user;
}

// UI Elements
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const sendResetBtn = document.getElementById('sendResetBtn');
const messageEl = document.getElementById('message');

const loginView = document.getElementById('login-view');
const forgotView = document.getElementById('forgot-view');
const showForgot = document.getElementById('showForgot');
const showLogin = document.getElementById('showLogin');

// View Switching Logic
if (showForgot) {
  showForgot.onclick = (e) => {
    e.preventDefault();
    messageEl.innerText = "";
    loginView.style.display = 'none';
    forgotView.style.display = 'block';
  };
}

if (showLogin) {
  showLogin.onclick = (e) => {
    e.preventDefault();
    messageEl.innerText = "";
    forgotView.style.display = 'none';
    loginView.style.display = 'block';
  };
}

// Handle Sign In
if (signInBtn) {
  signInBtn.onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      messageEl.innerText = "Please enter both email and password.";
      return;
    }

    signInBtn.innerText = "Signing in...";
    signInBtn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      messageEl.style.color = "#ff3b30";
      messageEl.innerText = error.message;
      signInBtn.innerText = "Sign In";
      signInBtn.disabled = false;
    } else {
      window.location.href = "products.html";
    }
  };
}

// Handle Sign Up
if (signUpBtn) {
  signUpBtn.onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
      messageEl.innerText = "Please enter both email and password.";
      return;
    }

    signUpBtn.innerText = "Creating account...";
    signUpBtn.disabled = true;

    const { error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      messageEl.style.color = "#ff3b30";
      messageEl.innerText = error.message;
      signUpBtn.innerText = "Create Business Account";
      signUpBtn.disabled = false;
    } else {
      messageEl.style.color = "var(--blue)";
      messageEl.innerText = "Success! Please check your email to confirm your account.";
      signUpBtn.innerText = "Account Created";
    }
  };
}

// Handle Password Recovery Request
if (sendResetBtn) {
  sendResetBtn.onclick = async () => {
    const email = document.getElementById('forgot-email').value;
    if (!email) {
      messageEl.innerText = "Please enter your email address.";
      return;
    }

    sendResetBtn.innerText = "Sending...";
    sendResetBtn.disabled = true;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password.html',
    });

    if (error) {
      messageEl.style.color = "#ff3b30";
      messageEl.innerText = error.message;
      sendResetBtn.innerText = "Send Reset Link";
      sendResetBtn.disabled = false;
    } else {
      messageEl.style.color = "var(--blue)";
      messageEl.innerText = "Recovery link sent! Please check your email.";
      sendResetBtn.innerText = "Link Sent";
    }
  };
}
