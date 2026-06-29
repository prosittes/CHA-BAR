/* ============================================
   CHÁ BAR & CHÁ DE CASA NOVA — APP DO CONVIDADO
   Firebase SDK v10 — Sintaxe Moderna de Módulos
   ============================================ */

// ---- CONFIGURAÇÃO DO FIREBASE ----
// SUBSTITUA ESTES VALORES PELAS SUAS CREDENCIAIS DO FIREBASE CONSOLE
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

// ---- REFERÊNCIAS DO DOM ----
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
const modalPresenteNome = document.getElementById('modal-presente-nome');
const inputPadrinho = document.getElementById('input-padrinho');
const toast = document.getElementById('toast');

// ---- ESTADO ----
let cidadeEscolhida = null;
let presenteSelecionadoId = null;
let presenteSelecionadoNome = null;
let presentesCache = [];

// ---- DADOS DAS CIDADES ----
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

// ---- DATA LIMITE PARA CONFIRMAÇÃO ----
const DATA_LIMITE = new Date('2026-07-26T23:59:59');

// ---- NAVEGAÇÃO ENTRE SEÇÕES ----
function mostrarSecao(nome) {
  Object.values(secoes).forEach(s => s.classList.remove('ativa'));
  secoes[nome].classList.add('ativa');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- SEÇÃO 1 → 2 ----
btnAvancar.addEventListener('click', () => mostrarSecao('local'));

// ---- SEÇÃO 2 → 3 ----
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

  // Verifica se passou do prazo
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

// ---- CONFIRMAÇÃO DE PRESENÇA ----
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
    mostrarToast('Erro ao salvar. Verifique as regras do Firebase.', 'erro');
  } finally {
    btn.disabled = false;
    btn.innerHTML = comparecera
      ? '<span>✓</span> Sim, confirmo minha presença'
      : '<span>✕</span> Não poderei comparecer';
  }
}

btnConfirmar.addEventListener('click', () => salvarConfirmacao(true));
btnNaoConfirmar.addEventListener('click', () => salvarConfirmacao(false));

// ---- IR PARA PRESENTES (sem confirmar) ----
btnIrPresentes.addEventListener('click', () => mostrarSecao('presentes'));

// ---- LISTA DE PRESENTES (Firestore Realtime) ----
function renderizarPresentes(presentes) {
  presentesCache = presentes;

  // Agrupa por categoria
  const categorias = {};
  presentes.forEach(p => {
    const cat = p.categoria || 'Sem Categoria';
    if (!categorias[cat]) categorias[cat] = [];
    categorias[cat].push(p);
  });

  // Ordem das categorias
  const ordemCategorias = [
    '🍳 Cozinha / Utilidades',
    '🍸 Bar',
    '🛏️ Cama e Banho',
    '🧹 Limpeza',
    '🏠 Casa'
  ];

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
    html += `<div class="categoria-grupo">
      <div class="categoria-titulo">${cat}</div>`;

    categorias[cat].forEach(p => {
      const reservado = p.status === 'reservado';
      html += `
        <div class="presente-card ${reservado ? 'reservado' : ''}">
          <div>
            <div class="presente-nome">${p.nome}</div>
            ${reservado ? `<div class="presente-padrinho">Reservado por: ${p.padrinho || '—'}</div>` : ''}
          </div>
          ${reservado
            ? '<span class="tag-reservado">🔒 Reservado</span>'
            : `<button class="btn-escolher" data-id="${p.id}" data-nome="${p.nome}">Escolher</button>`
          }
        </div>
      `;
    });

    html += `</div>`;
  });

  listaPresentes.innerHTML = html || '<p style="text-align:center;color:var(--cinza-claro);">Nenhum presente cadastrado ainda.</p>';

  document.querySelectorAll('.btn-escolher').forEach(btn => {
    btn.addEventListener('click', () => abrirModal(btn.dataset.id, btn.dataset.nome));
  });
}

// Listener em tempo real dos presentes
const qPresentes = query(collection(db, 'presentes'), orderBy('categoria'), orderBy('nome'));
onSnapshot(qPresentes, (snapshot) => {
  const presentes = [];
  snapshot.forEach(docSnap => {
    presentes.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderizarPresentes(presentes);
}, (erro) => {
  console.error('Erro ao carregar presentes:', erro);
  mostrarToast('Erro ao carregar presentes. Verifique as regras do Firebase.', 'erro');
});

// ---- MODAL DE RESERVA ----
function abrirModal(id, nome) {
  presenteSelecionadoId = id;
  presenteSelecionadoNome = nome;
  modalPresenteNome.textContent = `Presente: "${nome}"`;
  inputPadrinho.value = '';
  modalOverlay.classList.add('ativo');
  inputPadrinho.focus();
}

function fecharModal() {
  modalOverlay.classList.remove('ativo');
  presenteSelecionadoId = null;
  presenteSelecionadoNome = null;
}

btnFecharModal.addEventListener('click', fecharModal);
btnCancelarReserva.addEventListener('click', fecharModal);

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) fecharModal();
});

// ---- RESERVA COM TRANSAÇÃO FIREBASE ----
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

      if (!presenteDoc.exists()) {
        throw new Error('Presente não encontrado.');
      }

      const dados = presenteDoc.data();

      if (dados.status === 'reservado') {
        throw new Error('Este presente já foi reservado por outra pessoa.');
      }

      transaction.update(presenteRef, {
        status: 'reservado',
        padrinho: padrinho
      });
    });

    mostrarToast(`Presente "${presenteSelecionadoNome}" reservado com sucesso! 🤍`, 'sucesso');
    fecharModal();
  } catch (erro) {
    console.error('Erro na transação:', erro);
    mostrarToast(erro.message || 'Erro ao reservar. Verifique as regras do Firebase.', 'erro');
  } finally {
    btnConfirmarReserva.disabled = false;
    btnConfirmarReserva.innerHTML = 'Confirmar Reserva';
  }
});

// ---- TELA FINAL ----
btnFinalizar.addEventListener('click', () => mostrarSecao('final'));

// ---- TOAST ----
function mostrarToast(mensagem, tipo = '') {
  toast.textContent = mensagem;
  toast.className = 'toast';
  if (tipo) toast.classList.add(tipo);
  toast.classList.add('visivel');

  setTimeout(() => {
    toast.classList.remove('visivel');
  }, 3500);
}