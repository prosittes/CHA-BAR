/* ============================================
   CHÁ BAR & CHÁ DE CASA NOVA — PAINEL ADMIN
   Firebase SDK v10 — Otimizado com cache e timeout
   ============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  getDocs
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

// DOM Cadastro
const inputNomePresente = document.getElementById('input-nome-presente');
const selectCategoria = document.getElementById('select-categoria');
const inputValor = document.getElementById('input-valor');
const inputImagem = document.getElementById('input-imagem');
const previewImagem = document.getElementById('preview-imagem');
const btnCadastrar = document.getElementById('btn-cadastrar');

// DOM Tabela
const tabelaPresentes = document.getElementById('tabela-presentes');

// DOM Modal Edição
const modalEditar = document.getElementById('modal-editar');
const editId = document.getElementById('edit-id');
const editNome = document.getElementById('edit-nome');
const editCategoria = document.getElementById('edit-categoria');
const editValor = document.getElementById('edit-valor');
const editImagem = document.getElementById('edit-imagem');
const editPreview = document.getElementById('edit-preview');
const btnCancelarEdit = document.getElementById('btn-cancelar-edit');
const btnSalvarEdit = document.getElementById('btn-salvar-edit');

// DOM Listas
const listaAndrelandia = document.getElementById('lista-andrelandia');
const listaSJC = document.getElementById('lista-sjc');
const contadorAndrelandia = document.getElementById('contador-andrelandia');
const contadorSJC = document.getElementById('contador-sjc');
const toast = document.getElementById('toast');

let imagemBase64 = '';
let editImagemBase64 = '';

// ===== CACHE LOCAL =====
const CACHE_KEY_PRESENTES = 'cha_bar_presentes_cache';
const CACHE_KEY_CONFIRM = 'cha_bar_confirmacoes_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function salvarCache(chave, dados) {
  try {
    localStorage.setItem(chave, JSON.stringify({ data: dados, timestamp: Date.now() }));
  } catch (e) { /* ignora erro de storage */ }
}

function carregarCache(chave) {
  try {
    const item = localStorage.getItem(chave);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed.data;
  } catch (e) { return null; }
}

// ===== PREVIEW IMAGEM =====
inputImagem.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) { imagemBase64 = ''; previewImagem.classList.remove('visivel'); return; }
  if (file.size > 500 * 1024) { mostrarToast('Imagem muito grande. Máximo 500KB.', 'erro'); inputImagem.value = ''; return; }
  const reader = new FileReader();
  reader.onload = (event) => { imagemBase64 = event.target.result; previewImagem.src = imagemBase64; previewImagem.classList.add('visivel'); };
  reader.readAsDataURL(file);
});

editImagem.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) { editImagemBase64 = ''; editPreview.classList.remove('visivel'); return; }
  if (file.size > 500 * 1024) { mostrarToast('Imagem muito grande. Máximo 500KB.', 'erro'); editImagem.value = ''; return; }
  const reader = new FileReader();
  reader.onload = (event) => { editImagemBase64 = event.target.result; editPreview.src = editImagemBase64; editPreview.classList.add('visivel'); };
  reader.readAsDataURL(file);
});

// ===== CADASTRAR PRESENTE =====
btnCadastrar.addEventListener('click', async () => {
  const nome = inputNomePresente.value.trim();
  const categoria = selectCategoria.value;
  const valor = inputValor.value.trim();

  if (!nome) { mostrarToast('Digite o nome do presente.', 'erro'); return; }

  btnCadastrar.disabled = true;
  btnCadastrar.innerHTML = '<span class="spinner"></span>';

  try {
    await addDoc(collection(db, 'presentes'), {
      nome: nome,
      categoria: categoria,
      valor: valor,
      imagem: imagemBase64 || '',
      status: 'disponivel',
      padrinho: '',
      dataCadastro: serverTimestamp()
    });
    mostrarToast('Presente cadastrado com sucesso!', 'sucesso');
    inputNomePresente.value = '';
    inputValor.value = '';
    inputImagem.value = '';
    imagemBase64 = '';
    previewImagem.classList.remove('visivel');
  } catch (erro) {
    mostrarToast('Erro: ' + erro.message, 'erro');
  } finally {
    btnCadastrar.disabled = false;
    btnCadastrar.innerHTML = '<span>+</span> Cadastrar';
  }
});

// ===== RENDERIZAR TABELA =====
function renderizarTabela(presentes) {
  if (presentes.length === 0) {
    tabelaPresentes.innerHTML = `<tr><td colspan="7" class="vazio">Nenhum presente cadastrado ainda.</td></tr>`;
    return;
  }

  let html = '';
  presentes.forEach(p => {
    const reservado = p.status === 'reservado';
    const imgCell = p.imagem
      ? `<img src="${p.imagem}" alt="" class="presente-thumb" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\'presente-thumb-placeholder\'>🎁</div>'">`
      : `<div class="presente-thumb-placeholder">🎁</div>`;

    html += `
      <tr>
        <td>${imgCell}</td>
        <td style="font-weight:500; color:var(--preto);">${escapeHtml(p.nome)}</td>
        <td>${escapeHtml(p.categoria)}</td>
        <td>${escapeHtml(p.valor) || '—'}</td>
        <td><span class="tag-status ${reservado ? 'tag-reservado' : 'tag-disponivel'}">${reservado ? '🔒 Reservado' : '✓ Disponível'}</span></td>
        <td>${reservado ? escapeHtml(p.padrinho || '—') : '—'}</td>
        <td>
          <button class="btn btn-azul btn-pequeno" onclick="abrirEditar('${p.id}', '${escapeHtml(p.nome)}', '${escapeHtml(p.categoria)}', '${escapeHtml(p.valor || '')}', '${p.imagem ? escapeHtml(p.imagem) : ''}')">Editar</button>
          ${reservado ? `<button class="btn btn-vermelho btn-pequeno" onclick="resetarReserva('${p.id}')">Remover Reserva</button>` : ''}
        </td>
      </tr>
    `;
  });

  tabelaPresentes.innerHTML = html;
}

// ===== ESCAPE HTML CORRIGIDO =====
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===== CARREGAR PRESENTES COM CACHE + TIMEOUT =====
async function carregarPresentes() {
  // 1. Mostrar cache imediatamente (se existir)
  const cache = carregarCache(CACHE_KEY_PRESENTES);
  if (cache) {
    renderizarTabela(cache);
    tabelaPresentes.innerHTML = `<tr><td colspan="7" class="vazio">Atualizando...</td></tr>` + tabelaPresentes.innerHTML;
  }

  // 2. Tentar buscar do Firebase com timeout
  try {
    const snapshot = await Promise.race([
      getDocs(query(collection(db, 'presentes'))),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);

    const presentes = [];
    snapshot.forEach(docSnap => presentes.push({ id: docSnap.id, ...docSnap.data() }));

    salvarCache(CACHE_KEY_PRESENTES, presentes);
    renderizarTabela(presentes);

    // 3. Ativar onSnapshot para atualizações em tempo real (depois da carga inicial)
    onSnapshot(query(collection(db, 'presentes')), (snap) => {
      const updated = [];
      snap.forEach(d => updated.push({ id: d.id, ...d.data() }));
      salvarCache(CACHE_KEY_PRESENTES, updated);
      renderizarTabela(updated);
    });

  } catch (erro) {
    console.error('Erro ao carregar presentes:', erro);
    if (!cache) {
      tabelaPresentes.innerHTML = `<tr><td colspan="7" class="vazio">❌ Erro ao carregar. Verifique sua conexão e recarregue a página.<br><small style="color:var(--cinza-claro)">${erro.message}</small></td></tr>`;
    } else {
      mostrarToast('Usando dados em cache. Conexão lenta.', 'erro');
    }
  }
}

// ===== CARREGAR CONFIRMAÇÕES COM CACHE + TIMEOUT =====
async function carregarConfirmacoes() {
  const cache = carregarCache(CACHE_KEY_CONFIRM);
  if (cache) {
    renderizarConfirmacoes(cache);
  }

  try {
    const snapshot = await Promise.race([
      getDocs(query(collection(db, 'confirmacoes'))),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);

    const confirmacoes = [];
    snapshot.forEach(docSnap => confirmacoes.push({ id: docSnap.id, ...docSnap.data() }));

    salvarCache(CACHE_KEY_CONFIRM, confirmacoes);
    renderizarConfirmacoes(confirmacoes);

    // Atualiza em tempo real depois
    onSnapshot(query(collection(db, 'confirmacoes')), (snap) => {
      const updated = [];
      snap.forEach(d => updated.push({ id: d.id, ...d.data() }));
      salvarCache(CACHE_KEY_CONFIRM, updated);
      renderizarConfirmacoes(updated);
    });

  } catch (erro) {
    console.error('Erro ao carregar confirmações:', erro);
    if (!cache) {
      listaAndrelandia.innerHTML = `<div class="vazio">❌ Erro ao carregar. Recarregue a página.</div>`;
      listaSJC.innerHTML = `<div class="vazio">❌ Erro ao carregar. Recarregue a página.</div>`;
    }
  }
}

// ===== MODAL EDIÇÃO =====
window.abrirEditar = function(id, nome, categoria, valor, imagem) {
  editId.value = id;
  editNome.value = nome;
  editCategoria.value = categoria;
  editValor.value = valor;
  editImagemBase64 = '';
  editImagem.value = '';

  if (imagem) {
    editPreview.src = imagem;
    editPreview.classList.add('visivel');
  } else {
    editPreview.classList.remove('visivel');
  }

  modalEditar.classList.add('ativo');
};

btnCancelarEdit.addEventListener('click', () => {
  modalEditar.classList.remove('ativo');
  editId.value = '';
  editImagemBase64 = '';
});

modalEditar.addEventListener('click', (e) => { if (e.target === modalEditar) modalEditar.classList.remove('ativo'); });

btnSalvarEdit.addEventListener('click', async () => {
  const id = editId.value;
  if (!id) return;

  const dados = {
    nome: editNome.value.trim(),
    categoria: editCategoria.value,
    valor: editValor.value.trim()
  };

  if (editImagemBase64) dados.imagem = editImagemBase64;

  btnSalvarEdit.disabled = true;
  btnSalvarEdit.innerHTML = '<span class="spinner"></span>';

  try {
    await updateDoc(doc(db, 'presentes', id), dados);
    mostrarToast('Presente atualizado!', 'sucesso');
    modalEditar.classList.remove('ativo');
  } catch (erro) {
    mostrarToast('Erro: ' + erro.message, 'erro');
  } finally {
    btnSalvarEdit.disabled = false;
    btnSalvarEdit.innerHTML = 'Salvar Alterações';
  }
});

window.resetarReserva = async function(id) {
  if (!confirm('Remover reserva deste presente?')) return;
  try {
    await updateDoc(doc(db, 'presentes', id), { status: 'disponivel', padrinho: '' });
    mostrarToast('Reserva removida!', 'sucesso');
  } catch (erro) {
    mostrarToast('Erro: ' + erro.message, 'erro');
  }
};

// ===== RENDERIZAR CONFIRMAÇÕES =====
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
      <span class="nome">${escapeHtml(c.nome)}</span>
      <span class="${c.comparecera ? 'status-sim' : 'status-nao'}">${c.comparecera ? '✓ Sim' : '✕ Não'}</span>
    </div>
  `).join('');
}

// ===== TOAST =====
function mostrarToast(mensagem, tipo = '') {
  toast.textContent = mensagem;
  toast.className = 'toast';
  if (tipo) toast.classList.add(tipo);
  toast.classList.add('visivel');
  setTimeout(() => toast.classList.remove('visivel'), 3500);
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
  carregarPresentes();
  carregarConfirmacoes();
});