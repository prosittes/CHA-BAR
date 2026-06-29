/* ============================================
   CHÁ BAR & CHÁ DE CASA NOVA — PAINEL ADMIN
   Firebase SDK v10 — Configurado com credenciais reais
   ============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
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

// DOM
const inputNomePresente = document.getElementById('input-nome-presente');
const selectCategoria = document.getElementById('select-categoria');
const inputImagem = document.getElementById('input-imagem');
const btnCadastrar = document.getElementById('btn-cadastrar');
const tabelaPresentes = document.getElementById('tabela-presentes');
const listaAndrelandia = document.getElementById('lista-andrelandia');
const listaSJC = document.getElementById('lista-sjc');
const contadorAndrelandia = document.getElementById('contador-andrelandia');
const contadorSJC = document.getElementById('contador-sjc');
const toast = document.getElementById('toast');

// Cadastrar presente
btnCadastrar.addEventListener('click', async () => {
  const nome = inputNomePresente.value.trim();
  const categoria = selectCategoria.value;
  const imagem = inputImagem.value.trim();

  if (!nome) {
    mostrarToast('Digite o nome do presente.', 'erro');
    return;
  }

  btnCadastrar.disabled = true;
  btnCadastrar.innerHTML = '<span class="spinner"></span>';

  try {
    await addDoc(collection(db, 'presentes'), {
      nome: nome,
      categoria: categoria,
      imagem: imagem || '',
      status: 'disponivel',
      padrinho: '',
      dataCadastro: serverTimestamp()
    });

    mostrarToast('Presente cadastrado com sucesso!', 'sucesso');
    inputNomePresente.value = '';
    inputImagem.value = '';
  } catch (erro) {
    console.error('Erro:', erro);
    mostrarToast('Erro ao cadastrar: ' + erro.message, 'erro');
  } finally {
    btnCadastrar.disabled = false;
    btnCadastrar.innerHTML = '<span>+</span> Cadastrar';
  }
});

// Listener presentes
const qPresentes = query(collection(db, 'presentes'), orderBy('categoria'), orderBy('nome'));

onSnapshot(qPresentes, (snapshot) => {
  const presentes = [];
  snapshot.forEach(docSnap => presentes.push({ id: docSnap.id, ...docSnap.data() }));
  renderizarTabela(presentes);
}, (erro) => {
  console.error('Erro:', erro);
  mostrarToast('Erro ao carregar: ' + erro.message, 'erro');
});

function renderizarTabela(presentes) {
  if (presentes.length === 0) {
    tabelaPresentes.innerHTML = `<tr><td colspan="6" class="vazio">Nenhum presente cadastrado. Adicione um acima!</td></tr>`;
    return;
  }

  let html = '';
  presentes.forEach(p => {
    const reservado = p.status === 'reservado';
    const imgCell = p.imagem
      ? `<img src="${p.imagem}" alt="" class="presente-thumb" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\'presente-thumb-placeholder\'>🎁</div>'">`
      : `<div class="presente-thumb-placeholder">🎁</div>`;

    html += `
      <tr>
        <td>${imgCell}</td>
        <td style="font-weight:500; color:var(--preto);">${p.nome}</td>
        <td>${p.categoria}</td>
        <td><span class="tag-status ${reservado ? 'tag-reservado' : 'tag-disponivel'}">${reservado ? '🔒 Reservado' : '✓ Disponível'}</span></td>
        <td>${reservado ? (p.padrinho || '—') : '—'}</td>
        <td>
          ${reservado
            ? `<button class="btn btn-vermelho btn-pequeno" onclick="resetarReserva('${p.id}')">Remover Reserva</button>`
            : `<span style="color:var(--cinza-claro); font-size:0.8rem;">—</span>`
          }
        </td>
      </tr>
    `;
  });

  tabelaPresentes.innerHTML = html;
}

// Resetar reserva
window.resetarReserva = async function(id) {
  if (!confirm('Tem certeza que deseja remover a reserva?')) return;

  try {
    await updateDoc(doc(db, 'presentes', id), { status: 'disponivel', padrinho: '' });
    mostrarToast('Reserva removida!', 'sucesso');
  } catch (erro) {
    mostrarToast('Erro: ' + erro.message, 'erro');
  }
};

// Listener confirmações
const qConfirmacoes = query(collection(db, 'confirmacoes'), orderBy('dataRegistro', 'desc'));

onSnapshot(qConfirmacoes, (snapshot) => {
  const confirmacoes = [];
  snapshot.forEach(docSnap => confirmacoes.push({ id: docSnap.id, ...docSnap.data() }));
  renderizarConfirmacoes(confirmacoes);
}, (erro) => {
  console.error('Erro:', erro);
});

function renderizarConfirmacoes(confirmacoes) {
  const andrelandia = confirmacoes.filter(c => c.cidade === 'Andrelândia');
  const sjc = confirmacoes.filter(c => c.cidade === 'São José dos Campos');

  renderizarLista(listaAndrelandia, andrelandia);
  renderizarLista(listaSJC, sjc);

  const simAnd = andrelandia.filter(c => c.comparecera).length;
  const naoAnd = andrelandia.filter(c => !c.comparecera).length;
  contadorAndrelandia.innerHTML = `<strong>${simAnd}</strong> confirmaram · <strong>${naoAnd}</strong> não irão · Total: <strong>${andrelandia.length}</strong>`;

  const simSJC = sjc.filter(c => c.comparecera).length;
  const naoSJC = sjc.filter(c => !c.comparecera).length;
  contadorSJC.innerHTML = `<strong>${simSJC}</strong> confirmaram · <strong>${naoSJC}</strong> não irão · Total: <strong>${sjc.length}</strong>`;
}

function renderizarLista(elemento, lista) {
  if (lista.length === 0) {
    elemento.innerHTML = `<div class="vazio">Nenhuma confirmação ainda.</div>`;
    return;
  }
  elemento.innerHTML = lista.map(c => `
    <div class="item-presenca">
      <span class="nome">${c.nome}</span>
      <span class="${c.comparecera ? 'status-sim' : 'status-nao'}">${c.comparecera ? '✓ Sim' : '✕ Não'}</span>
    </div>
  `).join('');
}

function mostrarToast(mensagem, tipo = '') {
  toast.textContent = mensagem;
  toast.className = 'toast';
  if (tipo) toast.classList.add(tipo);
  toast.classList.add('visivel');
  setTimeout(() => toast.classList.remove('visivel'), 3500);
}