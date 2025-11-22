// Exporta a função principal que encapsula toda a lógica deste módulo
import { formatCurrency, showAlert } from './utils.js';
import * as api from './apiService.js'; // Importa nosso novo módulo de serviço
import * as store from './store.js'; // Importa o novo store
export function initAtivos() {

    // Seleciona os elementos do DOM com os quais vamos interagir
    const ativosContent = document.getElementById('ativos-content');
    const alertContainer = document.getElementById('alert-container');
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
            const ativosFromApi = await api.fetchInitialAtivos();
            // Transforma os dados recebidos da API para o formato que o front-end espera.
            const ativosFormatados = ativosFromApi.map(ativoFromApi => {
                return {
                    ticker: ativoFromApi.ticker,
                    nome: ativoFromApi.long_name || ativoFromApi.short_name, // Usa o nome longo ou o curto
                    classe_b3: ativoFromApi.classe_b3, // Mantém o nome original da API
                    logoUrl: null, // Inicializa 'logoUrl' como nulo
                    valor: null, // Inicializa 'valor' como nulo, pois não vem da lista inicial
                    changePercent: null // Inicializa a variação percentual
                };
            });

            // Define o estado inicial no store
            store.setState({ ativos: ativosFormatados });

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
        const ativos = store.getAtivos();
        // Cria um array de Promises, uma para cada requisição de atualização de ativo
        const updatePromises = ativos.map(async (ativo) => {
            try {
                const brapiData = await api.fetchBrapiData(ativo.ticker);
                ativo.nome = brapiData.longName || brapiData.shortName; // Atualiza o nome com os dados da Brapi
                ativo.valor = brapiData.regularMarketPrice;
                ativo.logoUrl = brapiData.logourl; // Atualiza a URL do logo
                ativo.changePercent = brapiData.regularMarketChangePercent; // Atualiza a variação percentual
            } catch (error) {
                console.warn(`Não foi possível buscar dados para ${ativo.ticker}: ${error}`);
                // O valor e nome do ativo permanecerão como estavam
            }
        });

        // Espera todas as buscas terminarem
        await Promise.all(updatePromises);

        // Notifica o store que o estado dos ativos foi modificado (mesmo que seja mutação)
        store.setState({ ativos: ativos });
    }

    /**
     * Renderiza a lista de ativos no DOM.
     * Esta função é chamada sempre que a lista de ativos é atualizada.
     */
    function renderAtivos() {
        const ativos = store.getAtivos();

        // Limpa o conteúdo atual para evitar duplicação
        ativosContent.innerHTML = '';

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
            

            // Prepara a exibição do valor e da variação
            let valorEVariacaoHTML = `<span class="badge bg-secondary rounded-pill">(Valor indisponível)</span>`;
            if (typeof ativo.valor === 'number') {
                const valorFormatado = formatCurrency(ativo.valor);
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
            const ativo = store.getAtivos().find(a => a.ticker === tickerParaEditar);
            if (ativo) {
                currentEditTicker = ativo.ticker;

                // Configura o modal para o modo de edição
                modalTitle.textContent = 'Editar Ativo';
                modalSubmitBtn.textContent = 'Atualizar Ativo';

                const tickerInput = document.getElementById('ticker-input');
                tickerInput.value = ativo.ticker;

                document.getElementById('class-select').value = ativo.classe_b3;

                deleteAssetBtn.classList.remove('d-none');
                addAssetModal.show();
            }
        }
    });

    /**
     * Orquestra a lógica de ATUALIZAÇÃO de um ativo existente.
     * @param {string} currentTicker - O ticker atual que está sendo editado.
     * @param {string} newTicker - O novo valor do ticker vindo do formulário.
     * @param {string} newClass - A nova classe do ativo vinda do formulário.
     */
    async function handleUpdateAtivo(currentTicker, newTicker, newClass) {
        const ativos = store.getAtivos();
        // Validação: Verifica se o novo ticker já existe em OUTRO ativo.
        const tickerExists = ativos.some(
            (ativo) => ativo.ticker === newTicker && ativo.ticker !== currentTicker
        );

        if (tickerExists) {
            throw new Error(`O ticker "${newTicker}" já está cadastrado.`);
        }

        let dadosExternos;
        try {
            const brapiData = await api.fetchBrapiData(newTicker);
            dadosExternos = { ...brapiData };
        } catch (apiError) {
            console.warn('Falha ao buscar dados na API externa durante a atualização:', apiError.message);
            if (window.APP_CONFIG.MANTER_INTEGRIDADE_DADOS) {
                throw new Error(`O ticker "${newTicker}" não foi encontrado ou a API externa falhou. A verificação de integridade está ativa.`);
            } else {
                console.log('Verificação de integridade desativada. Prosseguindo com a atualização local.');
                dadosExternos = { longName: null, shortName: null, logoUrl: null, regularMarketPrice: null, regularMarketChangePercent: null };
            }
        }

        const formData = new FormData();
        formData.append('ticker', newTicker);
        formData.append('classe_b3', newClass);
        if (dadosExternos.longName) formData.append('long_name', dadosExternos.longName);
        if (dadosExternos.shortName) formData.append('short_name', dadosExternos.shortName);
        
        let ativoAtualizado;
        try {
            ativoAtualizado = await api.patchAtivo(currentTicker, formData);
        } catch (backendError) {
            console.warn(`Falha ao comunicar com o back-end na atualização: ${backendError.message}. O ativo será atualizado apenas localmente.`);
            ativoAtualizado = {
                ticker: newTicker,
                long_name: dadosExternos.longName,
                short_name: dadosExternos.shortName,
                classe_b3: newClass
            };
        }

        const assetToUpdate = store.getAtivos().find(a => a.ticker === currentTicker);
        if (assetToUpdate) {
            assetToUpdate.ticker = ativoAtualizado.ticker;
            assetToUpdate.nome = ativoAtualizado.long_name || ativoAtualizado.short_name || assetToUpdate.nome;
            assetToUpdate.classe_b3 = ativoAtualizado.classe_b3;
            assetToUpdate.logoUrl = dadosExternos.logourl;
            assetToUpdate.valor = dadosExternos.regularMarketPrice;
            assetToUpdate.changePercent = dadosExternos.regularMarketChangePercent;
        }

        store.setState({ ativos: store.getAtivos() });
        showAlert(`Ativo "${currentTicker}" atualizado com sucesso para "${newTicker}".`, 'success');
    }

    /**
     * Orquestra a lógica de CRIAÇÃO de um novo ativo.
     * @param {string} newTicker - O ticker do novo ativo.
     * @param {string} newClass - A classe do novo ativo.
     */
    async function handleCreateAtivo(newTicker, newClass) {
        if (store.getAtivos().some(ativo => ativo.ticker === newTicker)) {
            throw new Error(`O ticker "${newTicker}" já está cadastrado.`);
        }

        let dadosExternos;
        try {
            const brapiData = await api.fetchBrapiData(newTicker);
            dadosExternos = { ...brapiData };
        } catch (apiError) {
            console.warn('Falha ao buscar dados na API externa:', apiError.message);
            if (window.APP_CONFIG.MANTER_INTEGRIDADE_DADOS) {
                throw new Error(`O ticker "${newTicker}" não foi encontrado ou a API externa falhou. A verificação de integridade está ativa.`);
            } else {
                console.log('Verificação de integridade desativada. Prosseguindo com o cadastro local.');
                dadosExternos = { longName: newTicker, shortName: newTicker, logoUrl: null, regularMarketPrice: null, regularMarketChangePercent: null };
            }
        }
        
        const formData = new FormData();
        formData.append('ticker', newTicker);
        formData.append('long_name', dadosExternos.longName || '');
        formData.append('short_name', dadosExternos.shortName || '');
        formData.append('classe_b3', newClass);

        let ativoCriado;
        try {
            ativoCriado = await api.postAtivo(formData);
        } catch (backendError) {
            console.warn(`Falha ao comunicar com o back-end: ${backendError.message}. O ativo será adicionado apenas localmente.`);
            ativoCriado = { ticker: newTicker, long_name: dadosExternos.longName, short_name: dadosExternos.shortName, classe_b3: newClass };
        }

        const novoAtivoParaLista = { ticker: ativoCriado.ticker, nome: ativoCriado.long_name || ativoCriado.short_name, classe_b3: ativoCriado.classe_b3, logoUrl: dadosExternos.logourl, valor: dadosExternos.regularMarketPrice, changePercent: dadosExternos.regularMarketChangePercent };
        const ativosAtuais = store.getAtivos();
        store.setState({ ativos: [...ativosAtuais, novoAtivoParaLista] });
        showAlert(`Ativo "${novoAtivoParaLista.ticker}" adicionado com sucesso!`, 'success');
    }

    // Event listener para o envio do formulário de adição de ativo
    addAssetForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const tickerInput = document.getElementById('ticker-input');
        const classSelect = document.getElementById('class-select');
        modalSubmitBtn.disabled = true; // Desabilita o botão para evitar cliques duplos

        try {
            if (currentEditTicker) {
                const newTicker = tickerInput.value.toUpperCase();
                const newClass = classSelect.value;
                await handleUpdateAtivo(currentEditTicker, newTicker, newClass);
            } else {
                const newTicker = tickerInput.value.toUpperCase();
                const newClass = classSelect.value;
                await handleCreateAtivo(newTicker, newClass);
            }
            addAssetModal.hide();
        } catch (error) {
            console.error('Erro ao salvar ativo:', error);
            showAlert(`Não foi possível salvar o ativo. Motivo: ${error.message}`, 'danger');
        }
        
        modalSubmitBtn.disabled = false;
    });

    // Event listener para o botão de excluir DENTRO do modal
    deleteAssetBtn.addEventListener('click', async function () {
        if (!currentEditTicker) return;

        const isConfirmed = confirm(`Tem certeza que deseja excluir o ativo ${currentEditTicker}? Esta ação não pode ser desfeita.`);

        if (isConfirmed) {
            try {
                await api.deleteAtivo(currentEditTicker);

                // Apenas se a exclusão no back-end for bem-sucedida, atualiza o front-end
                const ativosAtuais = store.getAtivos();
                store.setState({ ativos: ativosAtuais.filter(ativo => ativo.ticker !== currentEditTicker) });

                showAlert(`Ativo "${currentEditTicker}" excluído com sucesso.`, 'success');
                addAssetModal.hide();
            } catch (error) {
                console.error('Erro ao excluir ativo:', error);
                showAlert('Não foi possível excluir o ativo. Tente novamente.', 'danger');
            }
        }
    });


    // Adiciona um listener para o evento 'hide.bs.modal' para resolver o problema de acessibilidade.
    // Remove o foco do elemento ativo dentro do modal antes que ele seja ocultado.
    addAssetModalEl.addEventListener('hide.bs.modal', () => {
        if (document.activeElement && addAssetModalEl.contains(document.activeElement)) {
            document.activeElement.blur();
        }
    });

    // Reinicia o modal para o estado de "adição" quando ele é fechado
    addAssetModalEl.addEventListener('hidden.bs.modal', function () {
        currentEditTicker = null;
        addAssetForm.reset();

        modalTitle.textContent = 'Adicionar Novo Ativo';
        modalSubmitBtn.textContent = 'Salvar Ativo';
        modalSubmitBtn.disabled = false; // Garante que o botão esteja habilitado

        const tickerInput = document.getElementById('ticker-input');

        deleteAssetBtn.classList.add('d-none'); // Garante que o botão de excluir esteja oculto
    });

    // Inscreve a função de renderização no store. Ela será chamada sempre que o estado mudar.
    store.subscribe(renderAtivos);

    // Carrega os dados iniciais do back-end ao invés de renderizar a lista estática
    // Retorna a promise para que o chamador possa esperar a conclusão.
    return loadInitialAtivos();
}