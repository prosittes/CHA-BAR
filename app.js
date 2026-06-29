/* ============================================
   CHÁ BAR & CHÁ DE CASA NOVA — APP DO CONVIDADO
   Firebase SDK v10 — Configurado com credenciais reais
   ============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  runTransaction,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAVDtdnop4Ql0hu-Y7-rp0ykczzssn37H8",
  authDomain: "cha-bar-7721a.firebaseapp.com",
  projectId: "cha-bar-7721a",
  storageBucket: "cha-bar-7721a.firebasestorage.app",
  messagingSenderId: "931392992691",
  appId: "1:931392992691:web:b1951ba6d633e64067c7c6",
  measurementId: "G-9N83W7B4VT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---- DOM ----
const secoes = {
  inicial: document.getElementById('secao-inicial'),
  local: document.getElementById('secao-local'),
  confirmacao: document.getElementById('secao-confirmacao'),
  presentes: document.getElementById('secao-presentes'),
  final: document.getElementById('secao-final')
};

const btnAvancar = document.getElementById('btn-avancar');
const btnAndrelandia = document.getElementById('btn-andrelandia');
const btnSJC = document.getElementById('btn-sjc');
const infoCidade = document.getElementById('info-cidade');
const areaConfirmacao = document.getElementById('area-confirmacao');
const areaEncerrado = document.getElementById('area-encerrado');
const inputNome = document.getElementById('input-nome');
const btnConfirmar = document.getElementById('btn-confirmar');
const btnNaoConfirmar = document.getElementById('btn-nao-confirmar');
const btnIrPresentes = document.getElementById('btn-ir-presentes');
const listaPresentes = document.getElementById('lista-presentes');
const btnFinalizar = document.getElementById('btn-finalizar');
const modalOverlay = document.getElementById('modal-reserva');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnCancelarReserva = document.getElementById('btn-cancelar-reserva');
const btnConfirmarReserva = document.getElementById('btn-confirmar-reserva');
const modalPresenteImg = document.getElementById('modal-presente-img');
const modalPresenteNome = document.getElementById('modal-presente-nome');
const inputPadrinho = document.getElementById('input-padrinho');
const toast = document.getElementById('toast');

let cidadeEscolhida = null;
let presenteSelecionadoId = null;
let presenteSelecionadoNome = null;
let presenteSelecionadoImg = null;

const dadosCidades = {
  andrelandia: {
    nome: 'Andrelândia',
    estado: 'Minas Gerais',
    data: '08/08/2026',
    horario: '19h00',
    endereco: 'Rua Vereador José Zamora, Nº 20 — Bairro Santa Tereza'
  },
  sjc: {
    nome: 'São José dos Campos',
    estado: 'São Paulo',
    data: '29/08/2026',
    horario: '13h00',
    endereco: 'Rua Benedita Simões de Almeida, 54 - Ap 171, Jardim Aquarius'
  }
};

const DATA_LIMITE = new Date('2026-07-26T23:59:59');

function mostrarSecao(nome) {
  Object.values(secoes).forEach(s => s.classList.remove('ativa'));
  secoes[nome].classList.add('ativa');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Navegação
btnAvancar.addEventListener('click', () => mostrarSecao('local'));
btnAndrelandia.addEventListener('click', () => selecionarCidade('andrelandia'));
btnSJC.addEventListener('click', () => selecionarCidade('sjc'));

function selecionarCidade(cidadeKey) {
  cidadeEscolhida = cidadeKey;
  const dados = dadosCidades[cidadeKey];
  infoCidade.innerHTML = `
    <h3>📍 ${dados.nome} — ${dados.estado}</h3>
    <p><span class="destaque">Data:</span> ${dados.data} às ${dados.horario}</p>
    <p><span class="destaque">Endereço:</span> ${dados.endereco}</p>
  `;

  const agora = new Date();
  if (agora > DATA_LIMITE) {
    areaConfirmacao.style.display = 'none';
    areaEncerrado.style.display = 'block';
  } else {
    areaConfirmacao.style.display = 'block';
    areaEncerrado.style.display = 'none';
  }
  mostrarSecao('confirmacao');
}

// Confirmação de presença
async function salvarConfirmacao(comparecera) {
  const nome = inputNome.value.trim();
  if (!nome) {
    mostrarToast('Por favor, digite seu nome completo.', 'erro');
    return;
  }

  const btn = comparecera ? btnConfirmar : btnNaoConfirmar;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    await addDoc(collection(db, 'confirmacoes'), {
      nome: nome,
      cidade: dadosCidades[cidadeEscolhida].nome,
      comparecera: comparecera,
      dataRegistro: serverTimestamp()
    });

    mostrarToast(comparecera ? 'Presença confirmada com sucesso! 🤍' : 'Obrigado por avisar! 🤍', 'sucesso');
    inputNome.value = '';
    setTimeout(() => mostrarSecao('presentes'), 1200);
  } catch (erro) {
    console.error('Erro ao salvar confirmação:', erro);
    mostrarToast('Erro ao salvar: ' + erro.message, 'erro');
  } finally {
    btn.disabled = false;
    btn.innerHTML = comparecera
      ? '<span>✓</span> Sim, confirmo minha presença'
      : '<span>✕</span> Não poderei comparecer';
  }
}

btnConfirmar.addEventListener('click', () => salvarConfirmacao(true));
btnNaoConfirmar.addEventListener('click', () => salvarConfirmacao(false));
btnIrPresentes.addEventListener('click', () => mostrarSecao('presentes'));

// Lista de presentes com foto
function renderizarPresentes(presentes) {
  const categorias = {};
  presentes.forEach(p => {
    const cat = p.categoria || 'Sem Categoria';
    if (!categorias[cat]) categorias[cat] = [];
    categorias[cat].push(p);
  });

  const ordemCategorias = ['🍳 Cozinha / Utilidades', '🍸 Bar', '🛏️ Cama e Banho', '🧹 Limpeza', '🏠 Casa'];

  let html = '';
  const categoriasOrdenadas = Object.keys(categorias).sort((a, b) => {
    const idxA = ordemCategorias.indexOf(a);
    const idxB = ordemCategorias.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  categoriasOrdenadas.forEach(cat => {
    html += `<div class="categoria-grupo"><div class="categoria-titulo">${cat}</div>`;
    categorias[cat].forEach(p => {
      const reservado = p.status === 'reservado';
      const imgHtml = p.imagem
        ? `<img src="${p.imagem}" alt="${p.nome}" class="presente-img" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\'presente-img-placeholder\'>🎁</div>'">`
        : `<div class="presente-img-placeholder">🎁</div>`;

      html += `
        <div class="presente-card ${reservado ? 'reservado' : ''}">
          ${imgHtml}
          <div class="presente-info">
            <div class="presente-nome">${p.nome}</div>
            ${reservado ? `<div class="presente-padrinho">Reservado por: ${p.padrinho || '—'}</div>` : ''}
          </div>
          ${reservado
            ? '<span class="tag-reservado">🔒 Reservado</span>'
            : `<button class="btn-escolher" data-id="${p.id}" data-nome="${p.nome}" data-img="${p.imagem || ''}">Escolher</button>`
          }
        </div>
      `;
    });
    html += `</div>`;
  });

  listaPresentes.innerHTML = html || '<p style="text-align:center;color:var(--cinza-claro);">Nenhum presente cadastrado ainda.</p>';

  document.querySelectorAll('.btn-escolher').forEach(btn => {
    btn.addEventListener('click', () => abrirModal(btn.dataset.id, btn.dataset.nome, btn.dataset.img));
  });
}

const qPresentes = query(collection(db, 'presentes'), orderBy('categoria'), orderBy('nome'));
onSnapshot(qPresentes, (snapshot) => {
  const presentes = [];
  snapshot.forEach(docSnap => presentes.push({ id: docSnap.id, ...docSnap.data() }));
  renderizarPresentes(presentes);
}, (erro) => {
  console.error('Erro:', erro);
  mostrarToast('Erro ao carregar presentes: ' + erro.message, 'erro');
});

// Modal de reserva
function abrirModal(id, nome, img) {
  presenteSelecionadoId = id;
  presenteSelecionadoNome = nome;
  presenteSelecionadoImg = img;

  if (img) {
    modalPresenteImg.innerHTML = `<img src="${img}" alt="${nome}" onerror="this.parentElement.innerHTML='<div style=font-size:3rem>🎁</div>'">`;
  } else {
    modalPresenteImg.innerHTML = '<div style="font-size:3rem">🎁</div>';
  }

  modalPresenteNome.textContent = `Presente: "${nome}"`;
  inputPadrinho.value = '';
  modalOverlay.classList.add('ativo');
  inputPadrinho.focus();
}

function fecharModal() {
  modalOverlay.classList.remove('ativo');
  presenteSelecionadoId = null;
  presenteSelecionadoNome = null;
  presenteSelecionadoImg = null;
}

btnFecharModal.addEventListener('click', fecharModal);
btnCancelarReserva.addEventListener('click', fecharModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) fecharModal(); });

// Reserva com transação
btnConfirmarReserva.addEventListener('click', async () => {
  const padrinho = inputPadrinho.value.trim();
  if (!padrinho) {
    mostrarToast('Digite seu nome para reservar.', 'erro');
    return;
  }

  btnConfirmarReserva.disabled = true;
  btnConfirmarReserva.innerHTML = '<span class="spinner"></span> Processando...';

  try {
    const presenteRef = doc(db, 'presentes', presenteSelecionadoId);
    await runTransaction(db, async (transaction) => {
      const presenteDoc = await transaction.get(presenteRef);
      if (!presenteDoc.exists()) throw new Error('Presente não encontrado.');
      const dados = presenteDoc.data();
      if (dados.status === 'reservado') throw new Error('Este presente já foi reservado por outra pessoa.');
      transaction.update(presenteRef, { status: 'reservado', padrinho: padrinho });
    });

    mostrarToast(`Presente "${presenteSelecionadoNome}" reservado com sucesso! 🤍`, 'sucesso');
    fecharModal();
  } catch (erro) {
    console.error('Erro:', erro);
    mostrarToast(erro.message || 'Erro ao reservar.', 'erro');
  } finally {
    btnConfirmarReserva.disabled = false;
    btnConfirmarReserva.innerHTML = 'Confirmar Reserva';
  }
});

btnFinalizar.addEventListener('click', () => mostrarSecao('final'));

function mostrarToast(mensagem, tipo = '') {
  toast.textContent = mensagem;
  toast.className = 'toast';
  if (tipo) toast.classList.add(tipo);
  toast.classList.add('visivel');
  setTimeout(() => toast.classList.remove('visivel'), 3500);
}