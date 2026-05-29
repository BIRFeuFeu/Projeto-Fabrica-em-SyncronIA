// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'COLE_SUA_URL_DO_SUPABASE_AQUI';
const SUPABASE_ANON_KEY = 'COLE_SUA_CHAVE_ANON_AQUI';

// Inicializando o cliente (A biblioteca já foi importada no HTML)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. ELEMENTOS DA INTERFACE (DOM)
// ==========================================
const video = document.getElementById('camera');
const canvas = document.getElementById('snapshotCanvas');
const btnCapturar = document.getElementById('btnCapturar');
const btnCarregarDB = document.getElementById('btnCarregarDB');
const btnInspecionar = document.getElementById('btnInspecionar');
const statusUpload = document.getElementById('statusUpload');
const galeriaProdutos = document.getElementById('galeriaProdutos');
const resultadoInspecao = document.getElementById('resultadoInspecao');

// ==========================================
// 3. ATIVAR CÂMERA AO ABRIR O SITE
// ==========================================
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => { video.srcObject = stream; })
    .catch(err => { alert("Erro ao acessar câmera. Verifique as permissões do navegador."); });

// ==========================================
// 4. FUNÇÃO: TIRAR FOTO E ENVIAR PARA SUPABASE
// ==========================================
btnCapturar.addEventListener('click', async () => {
    statusUpload.innerText = "Preparando imagem...";
    statusUpload.style.color = "#E1E1E6";
    btnCapturar.disabled = true;

    // A. Desenha o vídeo no canvas para capturar o frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // B. Converte o canvas em um arquivo Blob (formato de imagem)
    canvas.toBlob(async (blob) => {
        const nomeArquivo = `produto_${Date.now()}.jpg`;

        try {
            statusUpload.innerText = "Enviando para o Supabase Storage...";

            // C. Faz o upload da imagem para a pasta 'produtos-referencia'
            const { data: storageData, error: storageError } = await supabase.storage
                .from('produtos-referencia')
                .upload(nomeArquivo, blob, { contentType: 'image/jpeg' });

            if (storageError) throw storageError;

            statusUpload.innerText = "Salvando no Banco de Dados...";

            // D. Salva o nome da imagem na tabela 'produtos'
            const { error: dbError } = await supabase
                .from('produtos')
                .insert([{ nome: 'Produto Referência', imagem_name: nomeArquivo }]);

            if (dbError) throw dbError;

            statusUpload.innerText = "✅ Salvo com sucesso!";
            statusUpload.style.color = "#00B37E";
            btnInspecionar.disabled = false; // Libera a inspeção
            
            // Atualiza a galeria automaticamente
            carregarDoBanco();

        } catch (error) {
            console.error(error);
            statusUpload.innerText = `❌ Erro: ${error.message}`;
            statusUpload.style.color = "#F75A68";
        } finally {
            btnCapturar.disabled = false;
        }
    }, 'image/jpeg', 0.8);
});

// ==========================================
// 5. FUNÇÃO: LER DO SUPABASE E MOSTRAR NA TELA
// ==========================================
async function carregarDoBanco() {
    galeriaProdutos.innerHTML = "<p>Carregando dados da nuvem...</p>";
    
    try {
        // A. Busca os registros na tabela
        const { data, error } = await supabase.from('produtos').select('*').order('criado_em', { ascending: false });
        
        if (error) throw error;

        galeriaProdutos.innerHTML = ""; // Limpa a área

        if (data.length === 0) {
            galeriaProdutos.innerHTML = "<p>Nenhum produto cadastrado ainda.</p>";
            return;
        }

        // B. Para cada registro, gera a URL da imagem e cria a tag <img>
        data.forEach(produto => {
            const { data: publicUrlData } = supabase.storage
                .from('produtos-referencia')
                .getPublicUrl(produto.imagem_name);

            const imgElement = document.createElement('img');
            imgElement.src = publicUrlData.publicUrl;
            imgElement.alt = produto.nome;
            galeriaProdutos.appendChild(imgElement);
            
            // Se tem produto no banco, libera o botão de inspeção
            btnInspecionar.disabled = false;
        });

    } catch (error) {
        galeriaProdutos.innerHTML = `<p style="color: red;">Erro ao carregar banco: ${error.message}</p>`;
    }
}

btnCarregarDB.addEventListener('click', carregarDoBanco);

// ==========================================
// 6. FUNÇÃO: SIMULAR A ANÁLISE DE QUALIDADE
// ==========================================
// Nota: Uma IA real de visão computacional exige servidores com GPUs dedicadas (ex: Python/TensorFlow). 
// Para apresentar num MVP Web, nós simulamos o tempo de resposta e o alerta.
btnInspecionar.addEventListener('click', () => {
    resultadoInspecao.innerText = 'Processando imagem via algoritmo...';
    resultadoInspecao.className = 'status-box';

    setTimeout(() => {
        const aprovado = Math.random() > 0.4; 

        if (aprovado) {
            resultadoInspecao.innerText = '🟢 PRODUTO CONFORME - Padrão atingido.';
            resultadoInspecao.className = 'status-box status-ok';
        } else {
            resultadoInspecao.innerText = '🔴 ALERTA: DEFEITO DETECTADO - Descarte a peça.';
            resultadoInspecao.className = 'status-box status-erro';
        }
    }, 1200); 
});

// Carrega a galeria assim que a página abrir
carregarDoBanco();
