// Exporta a função principal que encapsula toda a lógica deste módulo
export function initAtivos() {

    // Função para permitir que outros módulos acessem a lista de ativos
    window.getAtivos = () => ativos;

    // Nosso "banco de dados" local.
    let ativos = [];

    // Seleciona os elementos do DOM com os quais vamos interagir
    const ativosContent = document.getElementById('ativos-content');
    const addAssetForm = document.getElementById('add-asset-form');
    const addAssetModalEl = document.getElementById('addAssetModal');
    const addAssetModal = new bootstrap.Modal(addAssetModalEl);
    const modalTitle = document.getElementById('addAssetModalLabel');
    const modalSubmitBtn = addAssetModalEl.querySelector('button[type="submit"]');
    const deleteAssetBtn = document.getElementById('delete-asset-btn');

    // Variável de estado para rastrear se estamos editando um ativo
    let currentEditTicker = null;

    /**
     * Busca a lista inicial de ativos do back-end.
     */
    async function loadInitialAtivos() {
        // Exibe um indicador de carregamento para o usuário
        ativosContent.innerHTML = `<p class="text-center text-muted mt-3">Carregando ativos...</p>`;
        try {
            // Usa a URL base do arquivo de configuração e adiciona o endpoint específico.
            const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/ativos`);
            if (!response.ok) {
                throw new Error(`Erro na rede: ${response.statusText}`);
            }
            const data = await response.json();
            // Transforma os dados recebidos da API para o formato que o front-end espera.
            // A API retorna um objeto { ativos: [...] } e usa 'classe_b3'.
            ativos = data.ativos.map(ativoFromApi => {
                return {
                    ticker: ativoFromApi.ticker,
                    nome: ativoFromApi.nome,
                    classe: ativoFromApi.classe_b3, // Mapeia 'classe_b3' para 'classe'
                    valor: null // Inicializa 'valor' como nulo, pois não vem da lista inicial
                };
            });
            renderAtivos(); // Renderiza os ativos na tela
        } catch (error) {
            console.error('Falha ao carregar ativos do back-end:', error);
            ativosContent.innerHTML = `<p class="text-center text-danger mt-3">Falha ao carregar os ativos. Verifique a conexão com o servidor e tente novamente.</p>`;
        }
    }

    /**
     * Função para simular a busca de dados de um ativo em uma API externa.
     * Retorna uma Promise que resolve com os dados ou rejeita (simulando um erro).
     */
    function fetchAtivoData(ticker) {
        console.log(`Buscando dados para ${ticker}...`);
        // Simulação: A API falha para tickers com menos de 5 caracteres
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (ticker.length >= 5) {
                    // Simulação de sucesso
                    resolve({
                        nome: `Nome do Ativo ${ticker}`,
                        valor: Math.random() * 100 // Valor aleatório
                    });
                } else {
                    // Simulação de falha
                    reject('API indisponível ou ticker inválido.');
                }
            }, 500); // Simula a latência da rede
        });
    }

    /**
     * Renderiza a lista de ativos no DOM.
     * Esta função é chamada sempre que a lista de ativos é atualizada.
     */
    function renderAtivos() {
        // Limpa o conteúdo atual para evitar duplicação
        ativosContent.innerHTML = '';

        // Se não houver ativos, exibe a mensagem e encerra a função
        if (ativos.length === 0) {
            ativosContent.innerHTML = `<p class="text-center text-muted mt-3">Nenhum Ativo Cadastrado.</p>`;
            return;
        }

        // Se houver ativos, cria e renderiza a lista
        const listGroup = document.createElement('ul');
        listGroup.className = 'list-group list-group-flush';

        ativos.forEach(ativo => {
            const listItem = document.createElement('li');
            // A classe 'list-group-item-action' foi removida pois a ação agora é no botão
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';

            // Constrói o HTML para cada item da lista
            const nomeAtivo = ativo.nome ? ` - ${ativo.nome}` : ' - (Nome indisponível)';
            const valorAtivo = ativo.valor ? `R$ ${ativo.valor.toFixed(2)}` : '(Valor indisponível)';
            const badgeColor = ativo.valor ? 'bg-primary' : 'bg-secondary';

            listItem.innerHTML = `
                <div class="me-auto">
                    <span class="fw-bold">${ativo.ticker}</span>
                    <small class="text-muted">${nomeAtivo}</small>
                </div>
                <div class="d-flex align-items-center">
                    <span class="badge ${badgeColor} rounded-pill">${valorAtivo}</span>
                    <button class="btn btn-sm btn-outline-primary border-0 ms-2 edit-btn" data-ticker="${ativo.ticker}" title="Editar ${ativo.ticker}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
            `;
            listGroup.appendChild(listItem);
        });

        ativosContent.appendChild(listGroup);
    }

    // Event listener para ações na lista de ativos (usando delegação de eventos)
    ativosContent.addEventListener('click', function (event) {
        // Verifica se o clique foi no botão de editar
        const editButton = event.target.closest('.edit-btn');
        if (editButton) {
            const tickerParaEditar = editButton.dataset.ticker;
            const ativo = ativos.find(a => a.ticker === tickerParaEditar);
            if (ativo) {
                currentEditTicker = ativo.ticker; // Define o estado como "editando"

                // Configura o modal para o modo de edição
                modalTitle.textContent = 'Editar Ativo';
                modalSubmitBtn.textContent = 'Atualizar Ativo';

                const tickerInput = document.getElementById('ticker-input');
                tickerInput.value = ativo.ticker;

                document.getElementById('class-select').value = ativo.classe;

                deleteAssetBtn.classList.remove('d-none'); // Mostra o botão de excluir
                addAssetModal.show();
            }
        }
    });

    // Event listener para o envio do formulário de adição de ativo
    addAssetForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Previne o recarregamento da página
        const tickerInput = document.getElementById('ticker-input');
        const classSelect = document.getElementById('class-select');

        if (currentEditTicker) {
            // --- LÓGICA DE ATUALIZAÇÃO ---
            const newTicker = tickerInput.value.toUpperCase();

            // Validação: Verifica se o novo ticker já existe em OUTRO ativo.
            const tickerExists = ativos.some(
                (ativo) => ativo.ticker === newTicker && ativo.ticker !== currentEditTicker
            );

            if (tickerExists) {
                alert(`O ticker "${newTicker}" já está cadastrado. Por favor, insira um ticker diferente.`);
                return; // Interrompe a execução se o ticker já existir
            }

            const assetToUpdate = ativos.find(a => a.ticker === currentEditTicker);
            if (assetToUpdate) {
                assetToUpdate.ticker = newTicker;
                assetToUpdate.classe = classSelect.value;
            }
        } else {
            // --- LÓGICA DE CRIAÇÃO ---
            const newTicker = tickerInput.value.toUpperCase();
            if (ativos.some(ativo => ativo.ticker === newTicker)) {
                alert(`O ticker "${newTicker}" já está cadastrado.`);
                return;
            }
            const novoAtivo = {
                ticker: tickerInput.value.toUpperCase(),
                classe: classSelect.value,
                nome: null,
                valor: null
            };

            try {
                const data = await fetchAtivoData(novoAtivo.ticker);
                novoAtivo.nome = data.nome;
                novoAtivo.valor = data.valor;
            } catch (error) {
                console.warn(error);
            } finally {
                ativos.push(novoAtivo);
            }
        }

        renderAtivos();
        addAssetModal.hide();
    });

    // Event listener para o botão de excluir DENTRO do modal
    deleteAssetBtn.addEventListener('click', function () {
        if (!currentEditTicker) return;

        // Adiciona uma confirmação para segurança
        const isConfirmed = confirm(`Tem certeza que deseja excluir o ativo ${currentEditTicker}? Esta ação não pode ser desfeita.`);

        if (isConfirmed) {
            ativos = ativos.filter(ativo => ativo.ticker !== currentEditTicker);
            renderAtivos();
            addAssetModal.hide(); // Fecha o modal após a exclusão
        }
    });


    // Reinicia o modal para o estado de "adição" quando ele é fechado
    addAssetModalEl.addEventListener('hidden.bs.modal', function () {
        currentEditTicker = null; // Reinicia o estado
        addAssetForm.reset();

        modalTitle.textContent = 'Adicionar Novo Ativo';
        modalSubmitBtn.textContent = 'Salvar Ativo';

        const tickerInput = document.getElementById('ticker-input');

        deleteAssetBtn.classList.add('d-none'); // Garante que o botão de excluir esteja oculto
    });

    // Carrega os dados iniciais do back-end ao invés de renderizar a lista estática
    loadInitialAtivos();
}