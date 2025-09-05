// site.js (versão segura com Firebase Auth)

// Importações Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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
const auth = getAuth();

// Envia os dados da visita para sua planilha via Apps Script
async function enviarParaPlanilha(data) {
  try {
    await fetch('https://script.google.com/macros/s/AKfycbwnlc2B7-qyGV7gtS3tbMTJNkCxbuHoctdeHJJd_G_cXdXXz9fHS8UE6zDKaqspP4YNow/exec', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Erro ao enviar para a planilha:', err);
  }
}


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
const searchInput = document.getElementById('searchInput');

let editingId = null;
let currentStatusId = null;
let currentFilter = '';
let currentSort = 'agendadas-recentes';
let currentSearch = '';

// ----------------------
// FUNÇÃO DE LOGIN VERIFICADO
// ----------------------
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = 'login.html'; // redireciona se não logado
  } else {
    console.log("Usuário logado:", user.email);
    initSite(); // inicializa o site somente após login
  }
});

// Inicializa todas as funções do site
function initSite() {
  loadVisitas();
  updateDashboard();
}

// ----------------------
// SCROLL
// ----------------------
window.scrollToSection = id => document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
function scrollToSection(id){ window.scrollToSection(id); }

// ----------------------
// MODAIS
// ----------------------
closeModal.onclick = () => modal.classList.remove('show');
closeStatusModal.onclick = () => statusModal.classList.remove('show');
cancelStatusBtn.onclick = () => statusModal.classList.remove('show');

window.onclick = e => {
  if(e.target === modal) modal.classList.remove('show');
  if(e.target === statusModal) statusModal.classList.remove('show');
  if(e.target !== ordenarBtn && e.target !== ordenarMenu) ordenarMenu.style.display='none';
};

// ----------------------
// MENU ORDENAR
// ----------------------
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

// ----------------------
// FORMULÁRIO
// ----------------------
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

  // 🔹 Enviar para Google Sheets também
  await fetch("https://script.google.com/macros/s/AKfycbwgSlHjcSAypHswVY-1NN63VzI6xoxX15_fWGrc2eVglPVS4AWOjxLHaRa_ilRvRC1U-A/exec", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" }
  });

  visitaForm.reset();
  loadVisitas();
  scrollToSection('visitas');
} catch(err){
  console.error('Erro ao salvar visita:', err);
  alert('Erro ao salvar. Veja console.');
}


});

// ----------------------
// CRIAR CARD
// ----------------------
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

    // Atualização de status
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

    // Excluir visita
    modalButtons.querySelector('.delete-btn').onclick = async () => {
      if(!confirm('Deseja realmente excluir esta visita?')) return;
      await deleteDoc(doc(db,'visitas',id));
      modal.classList.remove('show');
      loadVisitas();
    };

    // Editar visita
    modalButtons.querySelector('.edit-btn').onclick = () => {
      editingId=id;
      Object.keys(visitaForm.elements).forEach(key => {
        if(visita[key]!==undefined) visitaForm.elements[key].value=visita[key];
      });
      modal.classList.remove('show');
      scrollToSection('agendamento');
    };

    // Impressão Profissional: Formulário de Encaminhamento
    modalButtons.querySelector('.print-btn').onclick = () => {
      const { jsPDF } = window.jspdf;
      const docPDF = new jsPDF('p','mm','a4');
      const pageWidth = docPDF.internal.pageSize.getWidth();
      const margin = { left: 20, right: 20, top: 20 };
      let y = margin.top;

      // Cabeçalho
      docPDF.setFont("helvetica","bold");
      docPDF.setFontSize(16);
      docPDF.text("FORMULÁRIO DE ENCAMINHAMENTO", pageWidth/2, y, { align: "center" });
      y += 15;

      docPDF.setFont("helvetica","normal");
      docPDF.setFontSize(12);
      const lineHeight = 8;

      docPDF.text("Encaminhamos o Sr.(a):", margin.left, y);
      docPDF.text(visita.nome || "______________________________", margin.left + 60, y);
      y += lineHeight;

      docPDF.text("Data de Nascimento:", margin.left, y);
      docPDF.text(visita.nascimento || "____/____/____", margin.left + 45, y);
      docPDF.text("CPF:", margin.left + 100, y);
      docPDF.text(visita.cpf || "________________", margin.left + 115, y);
      y += lineHeight;

      docPDF.text("Endereço:", margin.left, y);
      docPDF.text(visita.rua || "______________________________", margin.left + 35, y);
      docPDF.text("Bairro:", margin.left + 110, y);
      docPDF.text(visita.bairro || "________________", margin.left + 125, y);
      y += lineHeight;

      docPDF.text("Ponto de Referência:", margin.left, y);
      docPDF.text(visita.referencia || "______________________________", margin.left + 55, y);
      y += lineHeight + 5;

      const tableFields = [
        ["Motivo da Visita", visita.motivo],
        ["Dificuldades Apresentadas", visita.dificuldades],
        ["Observações", visita.observacoes],
        [" Agendamento", visita.responsavel],
        ["Data do Agendamento", visita.dataAgendamento],
        ["Status Atual da Visita", visita.status],
        ["Responsável pela Visita", visita.responsavelVisita],
        ["Data da Realização da Visita", visita.dataRealizacao],
        ["Parecer da Visita", visita.parecerVisita]
      ];

      const labelWidth = 60;
      const valueWidth = pageWidth - margin.left - margin.right - labelWidth;
      const cellPadding = 2;

      docPDF.setFont("helvetica","bold");
      tableFields.forEach(([label, value]) => {
        const textLines = docPDF.splitTextToSize(value || "______________________________", valueWidth - 2*cellPadding);
        const cellHeight = Math.max(10, textLines.length * lineHeight);

        if(y + cellHeight > docPDF.internal.pageSize.getHeight() - margin.top){
          docPDF.addPage();
          y = margin.top;
        }

        docPDF.rect(margin.left, y, labelWidth, cellHeight);
        docPDF.rect(margin.left + labelWidth, y, valueWidth, cellHeight);

        docPDF.text(label, margin.left + cellPadding, y + 7);
        docPDF.setFont("helvetica","normal");
        docPDF.text(textLines, margin.left + labelWidth + cellPadding, y + 7);
        docPDF.setFont("helvetica","bold");

        y += cellHeight;
      });

      y += 10;
      docPDF.setFont("helvetica","normal");
      docPDF.setFontSize(12);
      docPDF.text("Secretaria Municipal de Assistência Social - SEMAS", pageWidth/2, y, { align: "center" });
      y += 6;
      docPDF.text("Avenida Domingos Sertão S/N", pageWidth/2, y, { align: "center" });
      y += 6;
      docPDF.text("Pastos Bons - MA", pageWidth/2, y, { align: "center" });

      docPDF.save(`${sanitizeFilename(visita.nome)}-formulario-encaminhamento.pdf`);
    };

    modal.classList.add('show');
  });

  visitasContainer.appendChild(card);
  setTimeout(()=>card.classList.add('show'),50);
}



// ----------------------
// CARREGAR VISITAS
// ----------------------
// Carregar visitas com filtro e busca
async function loadVisitas() {
  visitasContainer.innerHTML = '';
  const snap = await getDocs(collection(db, 'visitas'));
  let visitas = [];
  snap.forEach(s => visitas.push({ id: s.id, ...s.data() }));

  // Aplicar filtro por bairro
  if (currentFilter) visitas = visitas.filter(v => v.bairro === currentFilter);

  // Aplicar busca por nome
  if (currentSearch) visitas = visitas.filter(v => v.nome.toLowerCase().includes(currentSearch.toLowerCase()));

  // Ordenação
  visitas.sort((a, b) => {
    switch (currentSort) {
      case 'agendadas-recentes':
        return new Date(b.dataAgendamentoISO || b.dataAgendamento) - new Date(a.dataAgendamentoISO || a.dataAgendamento);

      case 'agendadas-antigas':
        return new Date(a.dataAgendamentoISO || a.dataAgendamento) - new Date(b.dataAgendamentoISO || b.dataAgendamento);

      case 'realizadas-recentes':
        return compareVisitas(a, b, true);

      case 'realizadas-antigas':
        return compareVisitas(a, b, false);

      case 'alfabetica':
        return a.nome.localeCompare(b.nome);

      default:
        return 0;
    }
  });

  visitas.forEach(v => createCard(v, v.id));
  updateDashboard();
}

// Função auxiliar de comparação para ordenar realizadas e agendadas corretamente
function compareVisitas(a, b, recentes = true) {
  // Prioriza realizadas
  if (a.status === 'Realizada' && b.status !== 'Realizada') return -1;
  if (a.status !== 'Realizada' && b.status === 'Realizada') return 1;

  // Ambos realizadas
  if (a.status === 'Realizada' && b.status === 'Realizada') {
    const dateA = new Date(a.dataRealizacao || a.dataAgendamentoISO || a.dataAgendamento);
    const dateB = new Date(b.dataRealizacao || b.dataAgendamentoISO || b.dataAgendamento);
    return recentes ? dateB - dateA : dateA - dateB;
  }

  // Ambos agendadas
  const dateA = new Date(a.dataAgendamentoISO || a.dataAgendamento);
  const dateB = new Date(b.dataAgendamentoISO || b.dataAgendamento);
  return recentes ? dateB - dateA : dateA - dateB;
}

// ----------------------
// FILTRO POR BAIRRO
// ----------------------
bairroButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.bairro || '';
    loadVisitas();
  });
});

// ----------------------
// BARRA DE BUSCA
// ----------------------
searchInput.addEventListener('input', () => {
  currentSearch = searchInput.value.trim();
  loadVisitas();
});

// ----------------------
// MODAL DE STATUS (Marcar como realizada)
// ----------------------
statusForm.onsubmit = async e => {
  e.preventDefault();
  if(!responsavelVisitaInput.value.trim()) {
    alert('Informe o responsável pela visita');
    return;
  }
  await updateDoc(doc(db, 'visitas', currentStatusId), {
    status: 'Realizada',
    responsavelVisita: responsavelVisitaInput.value.trim(),
    parecerVisita: parecerVisitaInput.value.trim(),
    dataRealizacao: new Date().toLocaleDateString('pt-BR')
  });
  statusModal.classList.remove('show');
  loadVisitas();
};

// ----------------------
// DASHBOARD
// ----------------------
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
  document.getElementById('bairroSantaMariaAgendadas').textContent = bairros['Santa Maria'].agendadas + ' Agendadas';
  document.getElementById('bairroSantaMariaRealizadas').textContent = bairros['Santa Maria'].realizadas + ' Realizadas';
  document.getElementById('bairroZonaRuralAgendadas').textContent = bairros['Zona Rural'].agendadas + ' Agendadas';
  document.getElementById('bairroZonaRuralRealizadas').textContent = bairros['Zona Rural'].realizadas + ' Realizadas';
  document.getElementById('bairroPoeiraoAgendadas').textContent = bairros['Poeirão'].agendadas + ' Agendadas';
  document.getElementById('bairroPoeiraoRealizadas').textContent = bairros['Poeirão'].realizadas + ' Realizadas';
}

// ----------------------
// UTILITÁRIOS
// ----------------------
function escapeHtml(str){
  if(!str && str!==0) return '';
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}

function sanitizeFilename(name){
  return (name||'visita').replace(/[^a-z0-9_\-]/gi,'_');
}

// ----------------------
// LOGOUT
// ----------------------
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn){
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href='login.html');
  });
}




