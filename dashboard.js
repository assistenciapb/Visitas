// dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// ----------------------
// Firebase config
// ----------------------
const firebaseConfig = {
  apiKey: "AIzaSyA59M0bP6M_IMCWeWFscXwb5wJHRvlBqD8",
  authDomain: "visitas-9111e.firebaseapp.com",
  projectId: "visitas-9111e",
  storageBucket: "visitas-9111e.firebasestorage.app",
  messagingSenderId: "735353865446",
  appId: "1:735353865446:web:a7511948ce611250266727"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

// ----------------------
// DOM Elements
// ----------------------
const totalVisitas = document.getElementById('totalVisitas');
const totalAgendadas = document.getElementById('totalAgendadas');
const totalRealizadas = document.getElementById('totalRealizadas');

const graficoBairroCtx = document.getElementById('graficoBairro').getContext('2d');
const graficoRealizadasParecerCtx = document.getElementById('graficoRealizadasParecer').getContext('2d');
const graficoMotivosCtx = document.getElementById('graficoMotivos').getContext('2d');

const logoutBtn = document.getElementById('logoutBtn');
const filtrosTempo = document.querySelectorAll('.filtros-tempo button');
const mesSelect = document.getElementById('mesSelect');
const anoSelect = document.getElementById('anoSelect');

let currentTimeFilter = 'ano';
let selectedMonth = null;
let selectedYear = new Date().getFullYear();

let graficoBairro, graficoRealizadasParecer, graficoMotivos;

// ----------------------
// POPULA SELECT ANO
// ----------------------
const anoAtual = new Date().getFullYear();
for (let y = anoAtual - 5; y <= anoAtual + 1; y++) {
  const opt = document.createElement('option');
  opt.value = y;
  opt.textContent = y;
  if (y === anoAtual) opt.selected = true;
  anoSelect.appendChild(opt);
}

// ----------------------
// LOGOUT
// ----------------------
logoutBtn.addEventListener('click', () => signOut(auth).then(() => window.location.href='index.html'));

// ----------------------
// AUTENTICAÇÃO E CONTROLE DE ACESSO
// ----------------------
onAuthStateChanged(auth, async user => {
  if(!user){
    window.location.href='index.html';
    return;
  }

  // Obtém role do usuário
  let currentUserRole = 'user';
  const usersSnap = await getDocs(collection(db, 'usuarios'));
  usersSnap.forEach(u => {
    if(u.data().email === user.email) currentUserRole = u.data().role || 'user';
  });

  // Se não for admin, bloqueia acesso
  if(currentUserRole !== 'admin'){
    alert('Acesso negado. Apenas administradores podem acessar o dashboard.');
    window.location.href='site.html'; // redireciona para página segura
    return;
  }

  // Usuário é admin, inicializa dashboard
  initDashboard();
});

// ----------------------
// INICIALIZA DASHBOARD
// ----------------------
function initDashboard(){
  loadDashboard();
  initEventosFiltros();
}

// ----------------------
// EVENTOS FILTRO TEMPO
// ----------------------
function initEventosFiltros(){
  filtrosTempo.forEach(btn => {
    btn.addEventListener('click', () => {
      currentTimeFilter = btn.dataset.time;
      if(currentTimeFilter === 'mes' || currentTimeFilter === 'ano'){
        mesSelect.style.display = currentTimeFilter==='mes' ? 'inline-block' : 'none';
        anoSelect.style.display = 'inline-block';
      } else {
        mesSelect.style.display = 'none';
        anoSelect.style.display = 'none';
      }
      loadDashboard();
    });
  });

  mesSelect.addEventListener('change', () => {
    selectedMonth = mesSelect.value !== '' ? parseInt(mesSelect.value) : null;
    loadDashboard();
  });

  anoSelect.addEventListener('change', () => {
    selectedYear = anoSelect.value !== '' ? parseInt(anoSelect.value) : null;
    loadDashboard();
  });
}

// ----------------------
// CARREGAR DASHBOARD
// ----------------------
async function loadDashboard(){
  const visitasSnap = await getDocs(collection(db,'visitas'));
  let visitas = [];
  visitasSnap.forEach(v => visitas.push(v.data()));

  // ----------------------
  // FILTROS
  // ----------------------
  const now = new Date();
  visitas = visitas.filter(v => {
    const dataAgendamento = new Date(v.dataAgendamentoISO || v.dataAgendamento);
    const ano = dataAgendamento.getFullYear();
    const mes = dataAgendamento.getMonth();

    if(currentTimeFilter === 'semana'){
      const primeiraDiaSemana = new Date(now);
      primeiraDiaSemana.setDate(now.getDate() - now.getDay());
      const ultimoDiaSemana = new Date(primeiraDiaSemana);
      ultimoDiaSemana.setDate(primeiraDiaSemana.getDate() + 6);
      return dataAgendamento >= primeiraDiaSemana && dataAgendamento <= ultimoDiaSemana;
    }

    if(currentTimeFilter === 'mes'){
      if(!selectedMonth || !selectedYear) return true;
      return ano === selectedYear && mes === selectedMonth;
    }

    if(currentTimeFilter === 'ano'){
      if(!selectedYear) return true;
      return ano === selectedYear;
    }

    return true;
  });

  // ----------------------
  // ATUALIZA NUMEROS NO CARD
  // ----------------------
  const agendadas = visitas.filter(v => v.status==='Agendada').length;
  const realizadas = visitas.filter(v => v.status==='Realizada').length;
  totalVisitas.textContent = visitas.length;
  totalAgendadas.textContent = agendadas;
  totalRealizadas.textContent = realizadas;

  // ----------------------
  // VISITAS POR BAIRRO
  // ----------------------
  const bairros = ['Santa Maria','Zona Rural','Poeirão'];
  const datasetBairro = bairros.map(b => {
    return {
      agendadas: visitas.filter(v => v.bairro===b && v.status==='Agendada').length,
      realizadas: visitas.filter(v => v.bairro===b && v.status==='Realizada').length,
      parecer: visitas.filter(v => v.bairro===b && v.parecerTecnico===true).length
    };
  });

  if(graficoBairro) graficoBairro.destroy();
  graficoBairro = new Chart(graficoBairroCtx,{
    type:'bar',
    data:{
      labels:bairros,
      datasets:[
        { label:'Agendadas', data: datasetBairro.map(d=>d.agendadas), backgroundColor:'#3498db' },
        { label:'Realizadas', data: datasetBairro.map(d=>d.realizadas), backgroundColor:'#27ae60' },
        { label:'Parecer Técnico', data: datasetBairro.map(d=>d.parecer), backgroundColor:'#8e44ad' }
      ]
    },
    options:{ responsive:true, plugins:{ legend:{ position:'top' } } }
  });

  // ----------------------
  // REALIZADAS X COM PARECER
  // ----------------------
  const realizadasComParecer = visitas.filter(v=>v.status==='Realizada' && v.parecerTecnico).length;
  if(graficoRealizadasParecer) graficoRealizadasParecer.destroy();
  graficoRealizadasParecer = new Chart(graficoRealizadasParecerCtx,{
    type:'bar',
    data:{
      labels:['Realizadas','Realizadas c/ Parecer'],
      datasets:[{
        label:'Quantidade',
        data:[realizadas, realizadasComParecer],
        backgroundColor:['#27ae60','#8e44ad']
      }]
    },
    options:{ responsive:true, plugins:{ legend:{ display:false } } }
  });

  // ----------------------
  // MOTIVOS
  // ----------------------
  const motivosFiltrados = {};
  visitas.forEach(v=>{
    const m = v.motivo || 'Não informado';
    motivosFiltrados[m] = (motivosFiltrados[m] || 0) + 1;
  });
  if(graficoMotivos) graficoMotivos.destroy();
  graficoMotivos = new Chart(graficoMotivosCtx,{
    type:'bar',
    data:{
      labels:Object.keys(motivosFiltrados),
      datasets:[{
        label:'Quantidade',
        data:Object.values(motivosFiltrados),
        backgroundColor:'#2e5a86'
      }]
    },
    options:{ indexAxis:'y', responsive:true, plugins:{ legend:{ display:false } } }
  });
}
