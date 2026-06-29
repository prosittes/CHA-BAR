// ============================================
// admin.js — Painel Administrativo (Lista de Casamento)
// Bruna & Jhonatan
// ============================================

// ===== IMPORTAÇÕES DO FIREBASE (SDK v10 Modular) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const storage = getStorage(app);

// ===== REFERÊNCIAS DOM =====
const formCadastro = document.getElementById('formCadastro');
const nomeInput = document.getElementById('nomePresente');
const precoInput = document.getElementById('precoPresente');
const imagemInput = document.getElementById('imagemPresente');
const fileWrapper = document.getElementById('fileWrapper');
const fileButton = document.getElementById('fileButton');
const previewImagem = document.getElementById('previewImagem');
const btnSalvar = document.getElementById('btnSalvar');
const tabelaBody = document.getElementById('tabelaBody');
const toast = document.getElementById('toast');

// Estatísticas
const statTotal = document.getElementById('statTotal');
const statDisponiveis = document.getElementById('statDisponiveis');
const statReservados = document.getElementById('statReservados');

// ===== MOSTRAR TOAST =====
function mostrarToast(mensagem, tipo = 'sucesso') {
    toast.textContent = mensagem;
    toast.className = `toast ${tipo} visivel`;
    
    setTimeout(() => {
        toast.classList.remove('visivel');
    }, 3000);
}

// ===== PREVIEW DA IMAGEM =====
imagemInput.addEventListener('change', (e) => {
    const arquivo = e.target.files[0];
    
    if (arquivo) {
        // Mostra preview
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImagem.src = event.target.result;
            previewImagem.classList.add('visivel');
        };
        reader.readAsDataURL(arquivo);
        
        // Atualiza visual do botão
        fileWrapper.classList.add('has-file');
        fileButton.textContent = `📷 ${arquivo.name}`;
    } else {
        previewImagem.classList.remove('visivel');
        fileWrapper.classList.remove('has-file');
        fileButton.textContent = '📷 Clique para tirar foto ou escolher da galeria';
    }
});

// ===== UPLOAD DE IMAGEM PARA STORAGE =====
async function uploadImagem(arquivo) {
    // Gera um nome único para o arquivo (timestamp + nome original)
    const timestamp = Date.now();
    const nomeArquivo = `${timestamp}_${arquivo.name.replace(/\s/g, '_')}`;
    
    // Referência no Storage: presentes/nome_do_arquivo
    const storageRef = ref(storage, `presentes/${nomeArquivo}`);
    
    // Faz o upload
    await uploadBytes(storageRef, arquivo);
    
    // Pega a URL pública do arquivo
    const url = await getDownloadURL(storageRef);
    
    return url;
}

// ===== SALVAR PRESENTE =====
formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = nomeInput.value.trim();
    const preco = parseFloat(precoInput.value);
    const arquivo = imagemInput.files[0];
    
    // Validações
    if (!nome || nome.length < 2) {
        mostrarToast('Digite um nome válido para o presente.', 'erro');
        return;
    }
    
    if (isNaN(preco) || preco < 0) {
        mostrarToast('Digite um preço válido.', 'erro');
        return;
    }
    
    if (!arquivo) {
        mostrarToast('Selecione uma foto do presente.', 'erro');
        return;
    }

    // Desabilita o botão durante o upload
    btnSalvar.disabled = true;
    btnSalvar.textContent = '⏳ Enviando...';

    try {
        // 1. Faz upload da imagem para o Storage
        mostrarToast('Enviando imagem...', 'sucesso');
        const urlImagem = await uploadImagem(arquivo);
        
        // 2. Salva os dados no Firestore
        await addDoc(collection(db, 'presentes'), {
            nome: nome,
            preco: preco,
            url_imagem: urlImagem,
            status: 'disponivel',
            padrinho_nome: '',
            padrinho_whatsapp: '',
            data_cadastro: new Date().toISOString()
        });
        
        // 3. Limpa o formulário
        formCadastro.reset();
        previewImagem.classList.remove('visivel');
        fileWrapper.classList.remove('has-file');
        fileButton.textContent = '📷 Clique para tirar foto ou escolher da galeria';
        
        mostrarToast('✅ Presente cadastrado com sucesso!');
        
    } catch (erro) {
        console.error('Erro ao salvar:', erro);
        mostrarToast('❌ Erro ao cadastrar. Tente novamente.', 'erro');
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = '💾 Salvar Presente';
    }
});

// ===== FORMATAR PREÇO =====
function formatarPreco(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// ===== RENDERIZAR TABELA =====
function renderizarTabela(presentes) {
    // Atualiza estatísticas
    const total = presentes.length;
    const disponiveis = presentes.filter(p => p.status === 'disponivel').length;
    const reservados = presentes.filter(p => p.status === 'reservado').length;
    
    statTotal.textContent = total;
    statDisponiveis.textContent = disponiveis;
    statReservados.textContent = reservados;

    // Se não houver presentes
    if (total === 0) {
        tabelaBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="5">Nenhum presente cadastrado ainda.</td>
            </tr>
        `;
        return;
    }

    // Renderiza as linhas
    tabelaBody.innerHTML = '';
    
    presentes.forEach(presente => {
        const tr = document.createElement('tr');
        
        const statusClass = presente.status === 'disponivel' ? 'badge-disponivel' : 'badge-reservado';
        const statusText = presente.status === 'disponivel' ? 'Disponível' : 'Reservado';
        
        const padrinhoHtml = presente.status === 'reservado' 
            ? `
                <div class="padrinho-info">
                    <div class="padrinho-nome">${presente.padrinho_nome || '—'}</div>
                    <div class="padrinho-whatsapp">${presente.padrinho_whatsapp || '—'}</div>
                </div>
            `
            : '<span style="color: #ccc;">—</span>';
        
        tr.innerHTML = `
            <td>
                <img 
                    src="${presente.url_imagem}" 
                    alt="${presente.nome}" 
                    class="tabela-img"
                    onerror="this.src='https://via.placeholder.com/50?text=?'"
                >
            </td>
            <td>${presente.nome}</td>
            <td class="preco">${formatarPreco(presente.preco)}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>${padrinhoHtml}</td>
        `;
        
        tabelaBody.appendChild(tr);
    });
}

// ===== ESCUTAR PRESENTES EM TEMPO REAL =====
function iniciarEscuta() {
    // Ordena por data de cadastro (mais recente primeiro)
    const q = query(collection(db, 'presentes'), orderBy('data_cadastro', 'desc'));
    
    onSnapshot(q, (snapshot) => {
        const presentes = [];
        
        snapshot.forEach((docSnap) => {
            presentes.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        
        renderizarTabela(presentes);
    }, (erro) => {
        console.error('Erro ao carregar:', erro);
        tabelaBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="5">Erro ao carregar dados. Recarregue a página.</td>
            </tr>
        `;
    });
}

// ===== INICIALIZAÇÃO =====
iniciarEscuta();