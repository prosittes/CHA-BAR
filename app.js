// ============================================
// app.js — Visão do Convidado (Lista de Casamento)
// Bruna & Jhonatan
// ============================================

// ===== IMPORTAÇÕES DO FIREBASE (SDK v10 Modular) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    onSnapshot,
    doc,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ===== CONFIGURAÇÃO DO FIREBASE =====
// SUBSTITUA pelas suas chaves do Firebase Console
const firebaseConfig = {
   apiKey: "AIzaSyAVDtdnop4Ql0hu-Y7-rp0ykczzssn37H8",
  authDomain: "cha-bar-7721a.firebaseapp.com",
  projectId: "cha-bar-7721a",
  storageBucket: "cha-bar-7721a.firebasestorage.app",
  messagingSenderId: "931392992691",
  appId: "1:931392992691:web:b1951ba6d633e64067c7c6",
  measurementId: "G-9N83W7B4VT"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== REFERÊNCIAS DOM =====
const gridPresentes = document.getElementById('gridPresentes');
const modalOverlay = document.getElementById('modalOverlay');
const modalPresenteNome = document.getElementById('modalPresenteNome');
const nomeInput = document.getElementById('nomeConvidado');
const whatsappInput = document.getElementById('whatsappConvidado');
const btnConfirmar = document.getElementById('btnConfirmar');
const toast = document.getElementById('toast');

// ===== ESTADO =====
let presenteSelecionadoId = null; // ID do presente que o usuário está escolhendo
let unsubscribe = null; // Função para parar de ouvir o Firestore

// ===== FORMATAÇÃO DE PREÇO =====
function formatarPreco(valor) {
    return valor.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ===== MOSTRAR TOAST =====
function mostrarToast(mensagem, tipo = 'sucesso') {
    toast.textContent = mensagem;
    toast.className = `toast ${tipo} visivel`;
    
    setTimeout(() => {
        toast.classList.remove('visivel');
    }, 3500);
}

// ===== RENDERIZAR GRID =====
function renderizarGrid(presentes) {
    // Se não houver presentes disponíveis
    if (presentes.length === 0) {
        gridPresentes.innerHTML = `
            <div class="vazio">
                <div class="vazio-icon">🎁</div>
                <h3>Todos os presentes já foram escolhidos!<br>Obrigado pelo carinho de todos.</h3>
            </div>
        `;
        return;
    }

    // Limpa e renderiza os cards
    gridPresentes.innerHTML = '';
    
    presentes.forEach(presente => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-imagem">
                <img 
                    src="${presente.url_imagem}" 
                    alt="${presente.nome}"
                    loading="lazy"
                    onerror="this.src='https://via.placeholder.com/400x300?text=Sem+Imagem'"
                >
            </div>
            <div class="card-conteudo">
                <div class="card-nome">${presente.nome}</div>
                <div class="card-preco">${formatarPreco(presente.preco)}</div>
                <button class="btn-escolher" onclick="abrirModal('${presente.id}', '${presente.nome.replace(/'/g, "\\'")}')">
                    Escolher Presente ♥
                </button>
            </div>
        `;
        gridPresentes.appendChild(card);
    });
}

// ===== ESCUTAR PRESENTES EM TEMPO REAL =====
// Query: busca APENAS presentes com status "disponivel"
function iniciarEscuta() {
    const q = query(
        collection(db, 'presentes'),
        where('status', '==', 'disponivel')
    );

    // onSnapshot = atualiza automaticamente quando algo muda no banco
    unsubscribe = onSnapshot(q, (snapshot) => {
        const presentes = [];
        
        snapshot.forEach((docSnap) => {
            presentes.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        
        renderizarGrid(presentes);
    }, (erro) => {
        console.error('Erro ao carregar presentes:', erro);
        gridPresentes.innerHTML = `
            <div class="vazio">
                <div class="vazio-icon">⚠️</div>
                <h3>Erro ao carregar presentes.<br>Tente recarregar a página.</h3>
            </div>
        `;
    });
}

// ===== ABRIR MODAL =====
window.abrirModal = function(id, nome) {
    presenteSelecionadoId = id;
    modalPresenteNome.innerHTML = `Você está escolhendo: <strong>${nome}</strong>`;
    
    // Limpa os campos
    nomeInput.value = '';
    whatsappInput.value = '';
    
    // Abre o modal
    modalOverlay.classList.add('ativo');
    nomeInput.focus();
};

// ===== FECHAR MODAL =====
window.fecharModal = function() {
    modalOverlay.classList.remove('ativo');
    presenteSelecionadoId = null;
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Confirmar';
};

// ===== CONFIRMAR ESCOLHA (TRANSAÇÃO FIREBASE) =====
window.confirmarEscolha = async function() {
    const nome = nomeInput.value.trim();
    const whatsapp = whatsappInput.value.trim();

    // Validações
    if (!nome || nome.length < 3) {
        mostrarToast('Por favor, digite seu nome completo.', 'erro');
        nomeInput.focus();
        return;
    }
    
    if (!whatsapp || whatsapp.length < 10) {
        mostrarToast('Por favor, digite um WhatsApp válido.', 'erro');
        whatsappInput.focus();
        return;
    }
    
    if (!presenteSelecionadoId) {
        mostrarToast('Erro: nenhum presente selecionado.', 'erro');
        return;
    }

    // Desabilita o botão durante o processamento
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Processando...';

    try {
        // ===== TRANSAÇÃO FIREBASE (runTransaction) =====
        // Isso garante que ninguém mais possa reservar o mesmo presente ao mesmo tempo
        const presenteRef = doc(db, 'presentes', presenteSelecionadoId);
        
        await runTransaction(db, async (transaction) => {
            // 1. Lê o documento do presente
            const presenteSnap = await transaction.get(presenteRef);
            
            // Verifica se o documento existe
            if (!presenteSnap.exists()) {
                throw new Error('presente_nao_encontrado');
            }
            
            const dados = presenteSnap.data();
            
            // 2. Verifica se ainda está disponível
            if (dados.status !== 'disponivel') {
                throw new Error('presente_ja_reservado');
            }
            
            // 3. Se estiver disponível, atualiza para reservado
            transaction.update(presenteRef, {
                status: 'reservado',
                padrinho_nome: nome,
                padrinho_whatsapp: whatsapp,
                data_reserva: new Date().toISOString()
            });
        });

        // Sucesso! O onSnapshot vai remover o card automaticamente
        mostrarToast('🎉 Presente escolhido com sucesso! Obrigado!', 'sucesso');
        fecharModal();

    } catch (erro) {
        console.error('Erro na transação:', erro);
        
        if (erro.message === 'presente_ja_reservado') {
            mostrarToast('😢 Esse presente acabou de ser escolhido por outra pessoa. Escolha outro!', 'erro');
        } else if (erro.message === 'presente_nao_encontrado') {
            mostrarToast('Presente não encontrado no sistema.', 'erro');
        } else {
            mostrarToast('Erro ao reservar. Tente novamente.', 'erro');
        }
        
        fecharModal();
    }
};

// ===== FECHAR MODAL AO CLICAR FORA =====
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        fecharModal();
    }
});

// ===== FECHAR MODAL COM ESC =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('ativo')) {
        fecharModal();
    }
});

// ===== INICIALIZAÇÃO =====
iniciarEscuta();