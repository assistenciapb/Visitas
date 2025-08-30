// script.js (modular, Firebase v12+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Configuração Firebase
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

// DOM Elements
const visitaForm = document.getElementById('visitaForm');
const visitasContainer = document.getElementById('visitasContainer');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const modalButtons = document.getElementById('modalButtons');
const closeModal = document.getElementById('closeModal');

const statusModal = document.getElementById('statusModal');
const closeStatusModal = document.getElementById('closeStatusModal');
const statusForm = document.getElementById('statusForm');
const responsavelVisitaInput = document.getElementById('responsavelVisitaInput');
const parecerVisitaInput = document.getElementById('parecerVisitaInput');
const cancelStatusBtn = document.getElementById('cancelStatusBtn');

const bairroButtons = document.querySelectorAll('.bairro-btn');
const ordenarBtn = document.getElementById('ordenarBtn');
const ordenarMenu = document.getElementById('ordenarMenu');

let editingId = null;
let currentStatusId = null;
let currentFilter = '';
let currentSort = 'agendadas-recentes';

// Scroll util
window.scrollToSection = id => document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
function scrollToSection(id){ window.scrollToSection(id); }

// Close modals
closeModal.onclick = () => modal.classList.remove('show');
closeStatusModal.onclick = () => statusModal.classList.remove('show');
cancelStatusBtn.onclick = () => statusModal.classList.remove('show');
window.onclick = e => {
  if(e.target === modal) modal.classList.remove('show');
  if(e.target === statusModal) statusModal.classList.remove('show');
  if(e.target !== ordenarBtn && e.target !== ordenarMenu) ordenarMenu.style.display='none';
};

// Ordenar menu
ordenarBtn.onclick = e => {
  e.stopPropagation();
  ordenarMenu.style.display = ordenarMenu.style.display==='flex'?'none':'flex';
};
ordenarMenu.querySelectorAll('div').forEach(item=>{
  item.onclick = () => {
    currentSort = item.dataset.sort;
    ordenarMenu.style.display='none';
    loadVisitas();
  };
});

// Form submit
visitaForm.addEventListener('submit', async e => {
  e.preventDefault();
  const now = new Date();
  const data = {
    nome: visitaForm.nome.value.trim(),
    nascimento: visitaForm.nascimento.value,
    cpf: visitaForm.cpf.value.trim(),
    rua: visitaForm.rua.value.trim(),
    bairro: visitaForm.bairro.value.trim(),
    referencia: visitaForm.referencia.value.trim(),
    motivo: visitaForm.motivo.value.trim(),
    dificuldades: visitaForm.dificuldades.value.trim(),
    observacoes: visitaForm.observacoes.value.trim(),
    responsavel: visitaForm.responsavel.value.trim(),
    dataAgendamentoISO: now.toISOString(),
    dataAgendamento: now.toLocaleDateString('pt-BR'),
    horaAgendamento: now.toLocaleTimeString('pt-BR', {hour12:false}),
    status: 'Agendada',
    responsavelVisita:'',
    parecerVisita:'',
    dataRealizacao:''
  };

  try {
    if(editingId){
      await updateDoc(doc(db,'visitas',editingId), data);
      editingId = null;
    } else {
      await addDoc(collection(db,'visitas'), data);
    }
    visitaForm.reset();
    loadVisitas();
    scrollToSection('visitas');
  } catch(err){
    console.error('Erro ao salvar visita:', err);
    alert('Erro ao salvar. Veja console.');
  }
});

// Create card
function createCard(visita, id){
  const card = document.createElement('div');
  card.className='card';
  const statusClass = visita.status === 'Agendada' ? 'status-agendada' : 'status-realizada';
  card.innerHTML = `
    <p><strong>${escapeHtml(visita.nome)}</strong></p>
    <p class="muted">${escapeHtml(visita.dataAgendamento)}</p>
    <p class="status-label ${statusClass}">${escapeHtml(visita.status || 'Agendada')}</p>
  `;

  card.addEventListener('click', () => {
    modalBody.innerHTML = `
      <p><strong>Nome:</strong> ${escapeHtml(visita.nome)}</p>
      <p><strong>Data de Nascimento:</strong> ${escapeHtml(visita.nascimento)}</p>
      <p><strong>CPF:</strong> ${escapeHtml(visita.cpf)}</p>
      <p><strong>Endereço:</strong> ${escapeHtml(visita.rua)}, ${escapeHtml(visita.bairro)}</p>
      <p><strong>Ponto de referência:</strong> ${escapeHtml(visita.referencia || '-')}</p>
      <p><strong>Motivo:</strong> ${escapeHtml(visita.motivo || '-')}</p>
      <p><strong>Dificuldades:</strong> ${escapeHtml(visita.dificuldades || '-')}</p>
      <p><strong>Observações:</strong> ${escapeHtml(visita.observacoes || '-')}</p>
      <p><strong>Responsável:</strong> ${escapeHtml(visita.responsavel)}</p>
      <p><strong>Status:</strong> ${escapeHtml(visita.status || 'Agendada')}</p>
      <p><strong>Responsável pela visita:</strong> ${escapeHtml(visita.responsavelVisita || '-')}</p>
      <p><strong>Data de realização:</strong> ${escapeHtml(visita.dataRealizacao || '-')}</p>
      <p><strong>Parecer da visita:</strong> ${escapeHtml(visita.parecerVisita || '-')}</p>
    `;

    modalButtons.innerHTML=`
      <button class="status-btn">${visita.status==='Agendada'?'Marcar como Realizada':'Marcar como Agendada'}</button>
      <button class="edit-btn">Editar</button>
      <button class="delete-btn">Excluir</button>
      <button class="print-btn">Imprimir</button>
    `;

    modalButtons.querySelector('.status-btn').onclick = () => {
      if(visita.status==='Agendada'){
        currentStatusId=id;
        responsavelVisitaInput.value='';
        parecerVisitaInput.value='';
        statusModal.classList.add('show');
      } else {
        updateDoc(doc(db,'visitas',id),{
          status:'Agendada',
          responsavelVisita:'',
          parecerVisita:'',
          dataRealizacao:''
        }).then(()=> loadVisitas());
      }
    };

    modalButtons.querySelector('.delete-btn').onclick = async () => {
      if(!confirm('Deseja realmente excluir esta visita?')) return;
      await deleteDoc(doc(db,'visitas',id));
      modal.classList.remove('show');
      loadVisitas();
    };

    modalButtons.querySelector('.edit-btn').onclick = () => {
      editingId=id;
      Object.keys(visitaForm.elements).forEach(key => {
        if(visita[key]!==undefined) visitaForm.elements[key].value=visita[key];
      });
      modal.classList.remove('show');
      scrollToSection('agendamento');
    };

    modalButtons.querySelector('.print-btn').onclick = () => {
      const { jsPDF } = window.jspdf;
      const docPDF = new jsPDF();
      let y=20;
      docPDF.setFontSize(18); docPDF.setFont("helvetica","bold");
      docPDF.text("Visita Agendada",105,y,{align:"center"}); y+=12;
      docPDF.setLineWidth(0.5); docPDF.line(18,y,192,y); y+=10;
      docPDF.setFontSize(12);
      const campos=[
        ["Nome:", visita.nome],
        ["Data de Nascimento:", visita.nascimento],
        ["CPF:", visita.cpf],
        ["Endereço:", `${visita.rua}, ${visita.bairro}`],
        ["Ponto de referência:", visita.referencia||"-"],
        ["Motivo:", visita.motivo||"-"],
        ["Dificuldades:", visita.dificuldades||"-"],
        ["Observações:", visita.observacoes||"-"],
        ["Responsável:", visita.responsavel||"-"],
        ["Data/Hora do agendamento:", `${visita.dataAgendamento} ${visita.horaAgendamento}`],
        ["Status:", visita.status||"Agendada"],
        ["Responsável pela visita:", visita.responsavelVisita||"-"],
        ["Data de realização:", visita.dataRealizacao||"-"],
        ["Parecer da visita:", visita.parecerVisita||"-"]
      ];
      campos.forEach(([t,v])=>{
        docPDF.setFont("helvetica","bold"); docPDF.text(t,20,y);
        docPDF.setFont("helvetica","normal"); docPDF.text(String(v),70,y);
        y+=8;
        if(y>270){ docPDF.addPage(); y=20; }
      });
      docPDF.save(`${sanitizeFilename(visita.nome)}-visita.pdf`);
    };

    modal.classList.add('show');
  });

  visitasContainer.appendChild(card);
  setTimeout(()=>card.classList.add('show'),50);
}

// Carregar visitas
async function loadVisitas(){
  visitasContainer.innerHTML='';
  const snap = await getDocs(collection(db,'visitas'));
  let visitas=[];
  snap.forEach(s => visitas.push({id:s.id,...s.data()}));
  if(currentFilter) visitas = visitas.filter(v=>v.bairro===currentFilter);

  // Ordenação
  visitas.sort((a,b)=>{
    switch(currentSort){
      case 'agendadas-recentes': return new Date(b.dataAgendamentoISO||b.dataAgendamento) - new Date(a.dataAgendamentoISO||a.dataAgendamento);
      case 'agendadas-antigas': return new Date(a.dataAgendamentoISO||a.dataAgendamento) - new Date(b.dataAgendamentoISO||b.dataAgendamento);
      case 'realizadas-recentes': return (b.status==='Realizada'?1:0)-(a.status==='Realizada'?1:0) || new Date(b.dataRealizacao||b.dataAgendamentoISO||b.dataAgendamento)-new Date(a.dataRealizacao||a.dataAgendamentoISO||a.dataAgendamento);
      case 'realizadas-antigas': return (a.status==='Realizada'?1:0)-(b.status==='Realizada'?1:0) || new Date(a.dataRealizacao||a.dataAgendamentoISO||a.dataAgendamento)-new Date(b.dataRealizacao||b.dataAgendamentoISO||b.dataAgendamento);
      case 'alfabetica': return a.nome.localeCompare(b.nome);
      default: return 0;
    }
  });

  visitas.forEach(v => createCard(v,v.id));

  // Atualiza dashboard
  updateDashboard();
}

// Botões de filtro
bairroButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.bairro || '';
    loadVisitas();
  });
});

// Modal de status submit
statusForm.onsubmit=async e=>{
  e.preventDefault();
  if(!responsavelVisitaInput.value.trim()) return alert('Informe o responsável pela visita');
  await updateDoc(doc(db,'visitas',currentStatusId),{
    status:'Realizada',
    responsavelVisita: responsavelVisitaInput.value.trim(),
    parecerVisita: parecerVisitaInput.value.trim(),
    dataRealizacao:new Date().toLocaleDateString('pt-BR')
  });
  statusModal.classList.remove('show');
  loadVisitas();
};

// Atualizar dashboard
async function updateDashboard(){
  const snap = await getDocs(collection(db,'visitas'));
  let totalAgendadas = 0;
  let totalRealizadas = 0;

  let bairros = {
    'Santa Maria': {agendadas:0, realizadas:0},
    'Zona Rural': {agendadas:0, realizadas:0},
    'Poeirão': {agendadas:0, realizadas:0}
  };

  snap.forEach(s => {
    const v = s.data();
    if(v.status==='Agendada') totalAgendadas++;
    if(v.status==='Realizada') totalRealizadas++;

    if(bairros[v.bairro]){
      if(v.status==='Agendada') bairros[v.bairro].agendadas++;
      if(v.status==='Realizada') bairros[v.bairro].realizadas++;
    }
  });

  document.getElementById('totalAgendadas').textContent = totalAgendadas;
  document.getElementById('totalRealizadas').textContent = totalRealizadas;

  // Bairro Santa Maria
  document.getElementById('bairroSantaMariaAgendadas').textContent = bairros['Santa Maria'].agendadas+' Agendadas';
  document.getElementById('bairroSantaMariaRealizadas').textContent = bairros['Santa Maria'].realizadas+' Realizadas';

  // Bairro Zona Rural
  document.getElementById('bairroZonaRuralAgendadas').textContent = bairros['Zona Rural'].agendadas+' Agendadas';
  document.getElementById('bairroZonaRuralRealizadas').textContent = bairros['Zona Rural'].realizadas+' Realizadas';

  // Bairro Poeirão
  document.getElementById('bairroPoeiraoAgendadas').textContent = bairros['Poeirão'].agendadas+' Agendadas';
  document.getElementById('bairroPoeiraoRealizadas').textContent = bairros['Poeirão'].realizadas+' Realizadas';
}

// Utilitários
function escapeHtml(str){ if(!str && str!==0) return ''; return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function sanitizeFilename(name){ return (name||'visita').replace(/[^a-z0-9_\-]/gi,'_'); }

// Inicializar
loadVisitas();
