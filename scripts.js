// Aguarda o conteúdo do DOM ser totalmente carregado antes de executar o script
document.addEventListener('DOMContentLoaded', function () {

    // Nosso "banco de dados" local. Em um projeto real, isso poderia ser gerenciado com mais robustez.
    let ativos = [
        { ticker: 'PETR4', nome: 'Petrobras', classe: 'Ação', valor: 38.50 },
        { ticker: 'VALE3', nome: 'Vale', classe: 'Ação', valor: 62.75 },
        { ticker: 'MXRF11', nome: 'Maxi Renda FII', classe: 'FII', valor: 10.50 }
    ];

    // Seleciona os elementos do DOM com os quais vamos interagir
    const ativosContent = document.getElementById('ativos-content');
    const addAssetForm = document.getElementById('add-asset-form');
    const addAssetModalEl = document.getElementById('addAssetModal');
    const addAssetModal = new bootstrap.Modal(addAssetModalEl);
    const modalTitle = document.getElementById('addAssetModalLabel');
    const modalSubmitBtn = addAssetModalEl.querySelector('button[type="submit"]');
    const deleteAssetBtn = document.getElementById('delete-asset-btn');

    // State variable to track if we are editing an asset
    let currentEditTicker = null;

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
                currentEditTicker = ativo.ticker; // Set state to "editing"

                // Configura o modal para o modo de edição
                modalTitle.textContent = 'Editar Ativo';
                modalSubmitBtn.textContent = 'Atualizar Ativo';

                const tickerInput = document.getElementById('ticker-input');
                tickerInput.value = ativo.ticker;
                tickerInput.readOnly = true; // Prevent changing the primary key

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
            // --- UPDATE LOGIC ---
            const assetToUpdate = ativos.find(a => a.ticker === currentEditTicker);
            if (assetToUpdate) {
                assetToUpdate.classe = classSelect.value;
            }
        } else {
            // --- CREATE LOGIC (existing logic) ---
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


    // Reset modal to "add" state when it's closed
    addAssetModalEl.addEventListener('hidden.bs.modal', function () {
        currentEditTicker = null; // Reset state
        addAssetForm.reset();

        modalTitle.textContent = 'Adicionar Novo Ativo';
        modalSubmitBtn.textContent = 'Salvar Ativo';

        const tickerInput = document.getElementById('ticker-input');
        tickerInput.readOnly = false;

        deleteAssetBtn.classList.add('d-none'); // Garante que o botão de excluir esteja oculto
    });

    // Renderiza a lista inicial de ativos quando a página carrega
    renderAtivos();
});