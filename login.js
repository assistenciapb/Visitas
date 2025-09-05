import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Config Firebase (mesmo do site principal)
const firebaseConfig = {
  apiKey: "AIzaSyA59M0bP6M_IMCWeWFscXwb5wJHRvlBqD8",
  authDomain: "visitas-9111e.firebaseapp.com",
  projectId: "visitas-9111e",
  storageBucket: "visitas-9111e.firebasestorage.app",
  messagingSenderId: "735353865446",
  appId: "1:735353865446:web:a7511948ce611250266727"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginSenha = document.getElementById('loginSenha');
const loginError = document.getElementById('loginError');

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginSenha.value.trim());
    window.location.href = 'site.html'; // redireciona para site principal
  } catch(err){
    console.error(err);
    loginError.textContent = 'Email ou senha incorretos!';
  }
});
