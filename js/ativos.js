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
                    nome: ativoFromApi.long_name || ativoFromApi.short_name, // Usa o nome longo ou o curto
                    classe: ativoFromApi.classe_b3, // Mapeia 'classe_b3' para 'classe'
                    logoUrl: null, // Inicializa 'logoUrl' como nulo
                    valor: null, // Inicializa 'valor' como nulo, pois não vem da lista inicial
                    changePercent: null // Inicializa a variação percentual
                };
            });

            // Renderiza uma primeira vez para o usuário ver a lista rapidamente
            renderAtivos();

            // Agora, busca os valores atualizados para cada ativo em segundo plano
            await updateAllAssetValues();

        } catch (error) {
            console.error('Falha ao carregar ativos do back-end:', error);
            ativosContent.innerHTML = `<p class="text-center text-danger mt-3">Falha ao carregar os ativos. Verifique a conexão com o servidor e tente novamente.</p>`;
        }
    }

    /**
     * Itera sobre todos os ativos e busca seus valores de mercado atualizados.
     */
    async function updateAllAssetValues() {
        // Cria um array de Promises, uma para cada requisição de atualização de ativo
        const updatePromises = ativos.map(async (ativo) => {
            try {
                const data = await fetchAtivoData(ativo.ticker);
                ativo.nome = data.longName || data.shortName; // Atualiza o nome com os dados da Brapi
                ativo.valor = data.valor;
                ativo.logoUrl = data.logoUrl; // Atualiza a URL do logo
                ativo.changePercent = data.changePercent; // Atualiza a variação percentual
            } catch (error) {
                console.warn(`Não foi possível buscar dados para ${ativo.ticker}: ${error}`);
                // O valor e nome do ativo permanecerão como estavam
            }
        });

        // Espera todas as buscas terminarem
        await Promise.all(updatePromises);

        // Re-renderiza a lista com os valores atualizados
        renderAtivos();
    }

    /**
     * Busca os dados de um ativo específico (nome e valor) na API da Brapi.
     * @param {string} ticker O código do ativo a ser buscado.
     * @returns {Promise<object>} Uma promise que resolve com os dados detalhados do ativo.
     */
    async function fetchAtivoData(ticker) {
        const token = window.APP_CONFIG.BRAPI_TOKEN;
        const url = `https://brapi.dev/api/quote/${ticker}?token=${token}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Falha na requisição para a API Brapi: ${response.statusText}`);

        const data = await response.json();
        const result = data.results && data.results[0];

        if (!result || data.error) throw new Error(data.error || `Ticker "${ticker}" não encontrado.`);

        // Sanitiza os nomes para remover espaços extras no início, fim e entre as palavras.
        const longName = result.longName ? result.longName.trim().replace(/\s+/g, ' ') : null;
        const shortName = result.shortName ? result.shortName.trim().replace(/\s+/g, ' ') : null;

        return {
            // Retorna ambos os nomes para que o chamador decida qual usar.
            longName: longName,
            shortName: shortName,
            valor: result.regularMarketPrice,
            logoUrl: result.logourl,
            changePercent: result.regularMarketChangePercent
        };
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
            // Define a URL do logo. Usa um logo genérico se a URL não estiver disponível ou for o logo padrão da Brapi.
            const logoUrl = (ativo.logoUrl && ativo.logoUrl !== "https://icons.brapi.dev/icons/BRAPI.svg")
                ? ativo.logoUrl
                : './img/logoTickerGenerico.png';
            const nomeAtivo = ativo.nome ? ` - ${ativo.nome}` : ' - (Nome indisponível)';

            // Prepara a exibição do valor e da variação
            let valorEVariacaoHTML = `<span class="badge bg-secondary rounded-pill">(Valor indisponível)</span>`;
            if (typeof ativo.valor === 'number') {
                const valorFormatado = `R$ ${ativo.valor.toFixed(2)}`;
                let variacaoHTML = '';

                if (typeof ativo.changePercent === 'number') {
                    const variacao = ativo.changePercent;
                    const corVariacao = variacao >= 0 ? 'text-success' : 'text-danger';
                    const iconeVariacao = variacao >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right';
                    variacaoHTML = `<small class="${corVariacao} ms-2"><i class="bi ${iconeVariacao}"></i> ${variacao.toFixed(2)}%</small>`;
                }

                valorEVariacaoHTML = `<span class="badge bg-primary rounded-pill">${valorFormatado}</span>${variacaoHTML}`;
            }

            listItem.innerHTML = `
                <!-- Coluna Esquerda: Logo, Ticker e Nome -->
                <div class="d-flex align-items-center me-3" style="min-width: 0;">
                    <img src="${logoUrl}" alt="Logo de ${ativo.ticker}" class="me-3 flex-shrink-0" style="width: 32px; height: 32px; border-radius: 50%;">
                    <div class="flex-grow-1 text-truncate">
                        <div class="fw-bold">${ativo.ticker}</div>
                        <small class="text-muted">${ativo.nome || 'Nome indisponível'}</small>
                    </div>
                </div>
                <!-- Coluna Direita: Preço, Variação e Botão -->
                <div class="d-flex align-items-center flex-shrink-0">
                    <div class="text-end me-2">
                        ${valorEVariacaoHTML}
                    </div>
                    <button class="btn btn-sm btn-outline-secondary border-0 edit-btn" data-ticker="${ativo.ticker}" title="Editar ${ativo.ticker}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                </div>
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
        modalSubmitBtn.disabled = true; // Desabilita o botão para evitar cliques duplos

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
            // A lógica de atualização do back-end será implementada depois.
            renderAtivos();
            addAssetModal.hide();

        } else {
            // --- LÓGICA DE CRIAÇÃO ---
            const newTicker = tickerInput.value.toUpperCase();
            if (ativos.some(ativo => ativo.ticker === newTicker)) {
                alert(`O ticker "${newTicker}" já está cadastrado.`);
                modalSubmitBtn.disabled = false; // Reabilita o botão
                return;
            }

            try {
                let dadosExternos;

                try {
                    // 1. SEMPRE tenta buscar os dados na API externa primeiro.
                    dadosExternos = await fetchAtivoData(newTicker);
                } catch (apiError) {
                    // 2. Se a busca falhar, AQUI verificamos a configuração de integridade.
                    console.warn('Falha ao buscar dados na API externa:', apiError.message);

                    if (window.APP_CONFIG.MANTER_INTEGRIDADE_DADOS) {
                        // 3a. Se a integridade está ATIVADA, a operação deve falhar. Lançamos o erro.
                        throw new Error(`O ticker "${newTicker}" não foi encontrado ou a API externa falhou. A verificação de integridade está ativa.`);
                    } else {
                        // 3b. Se a integridade está DESATIVADA, a operação continua com dados mínimos.
                        console.log('Verificação de integridade desativada. Prosseguindo com o cadastro local.');
                        dadosExternos = { longName: newTicker, shortName: newTicker, logoUrl: null, valor: null, changePercent: null };
                    }
                }
                
                // 4. Cria um objeto FormData e anexa os dados (sejam eles completos ou mínimos)
                const formData = new FormData();
                formData.append('ticker', newTicker);
                formData.append('long_name', dadosExternos.longName || ''); // Envia string vazia se for nulo
                formData.append('short_name', dadosExternos.shortName || ''); // Envia string vazia se for nulo
                formData.append('classe_b3', classSelect.value); // Agora o valor já vem correto do HTML

                let ativoCriado;

                try {
                    // 5. TENTA enviar para o nosso back-end.
                    const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/ativos`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) throw new Error('O servidor respondeu com um erro.');

                    ativoCriado = await response.json();

                } catch (backendError) {
                    // 6. Se o back-end falhar, exibe um aviso, mas NÃO interrompe a operação.
                    console.warn(`Falha ao comunicar com o back-end: ${backendError.message}. O ativo será adicionado apenas localmente.`);
                    // Cria um objeto 'ativoCriado' localmente para que a UI possa ser atualizada.
                    ativoCriado = {
                        ticker: newTicker,
                        long_name: dadosExternos.longName,
                        short_name: dadosExternos.shortName,
                        classe_b3: classSelect.value
                    };
                }

                // 7. Adiciona o novo ativo na lista local (front-end), independentemente do sucesso do back-end.
                const novoAtivoParaLista = {
                    ticker: ativoCriado.ticker,
                    nome: ativoCriado.long_name || ativoCriado.short_name, // Usa o nome que veio do back-end
                    classe: ativoCriado.classe_b3,
                    logoUrl: dadosExternos.logoUrl,
                    valor: dadosExternos.valor,
                    changePercent: dadosExternos.changePercent
                };
                ativos.push(novoAtivoParaLista);
                renderAtivos();
                addAssetModal.hide();

            } catch (error) {
                console.error('Erro ao adicionar novo ativo:', error);
                alert(`Não foi possível adicionar o ativo. Verifique se o ticker "${newTicker}" é válido e tente novamente.`);
            }
        }
        
        modalSubmitBtn.disabled = false; // Reabilita o botão ao final da operação
    });

    // Event listener para o botão de excluir DENTRO do modal
    deleteAssetBtn.addEventListener('click', async function () {
        if (!currentEditTicker) return;

        // Adiciona uma confirmação para segurança
        const isConfirmed = confirm(`Tem certeza que deseja excluir o ativo ${currentEditTicker}? Esta ação não pode ser desfeita.`);

        if (isConfirmed) {
            try {
                const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/ativos?ticker=${currentEditTicker}`, {
                    method: 'DELETE'
                });

                if (!response.ok) throw new Error('Falha ao excluir o ativo no servidor.');

                // Apenas se a exclusão no back-end for bem-sucedida, atualiza o front-end
                ativos = ativos.filter(ativo => ativo.ticker !== currentEditTicker);
                renderAtivos();
                addAssetModal.hide(); // Fecha o modal após a exclusão
            } catch (error) {
                console.error('Erro ao excluir ativo:', error);
                alert('Não foi possível excluir o ativo. Tente novamente.');
            }
        }
    });


    // Reinicia o modal para o estado de "adição" quando ele é fechado
    addAssetModalEl.addEventListener('hidden.bs.modal', function () {
        currentEditTicker = null; // Reinicia o estado
        addAssetForm.reset();

        modalTitle.textContent = 'Adicionar Novo Ativo';
        modalSubmitBtn.textContent = 'Salvar Ativo';
        modalSubmitBtn.disabled = false; // Garante que o botão esteja habilitado

        const tickerInput = document.getElementById('ticker-input');

        deleteAssetBtn.classList.add('d-none'); // Garante que o botão de excluir esteja oculto
    });

    // Carrega os dados iniciais do back-end ao invés de renderizar a lista estática
    loadInitialAtivos();
}