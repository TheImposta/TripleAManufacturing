import { supabase } from "./supabase.js";

// Check if user is logged in and update UI
export async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  const authLink = document.getElementById('auth-link');
  
  if (authLink) {
    if (user) {
      // Check if user is admin (simple check for now, can be improved with profiles table)
      const isAdmin = user.email.includes('admin'); 
      
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

// Handle Login/Signup if on auth page
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const messageEl = document.getElementById('message');

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
      messageEl.innerText = error.message;
      signInBtn.innerText = "Sign In";
      signInBtn.disabled = false;
    } else {
      window.location.href = "products.html";
    }
  };

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
