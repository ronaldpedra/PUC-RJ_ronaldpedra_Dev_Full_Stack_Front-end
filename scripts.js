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
                    <button class="btn btn-sm btn-outline-danger border-0 ms-2 delete-btn" data-ticker="${ativo.ticker}" title="Remover Ativo">
                        <i class="bi bi-trash" data-ticker="${ativo.ticker}"></i>
                    </button>
                </div>
            `;
            listGroup.appendChild(listItem);
        });

        ativosContent.appendChild(listGroup);
    }

    // Event listener para exclusão de ativos (usando delegação de eventos)
    ativosContent.addEventListener('click', function (event) {
        // Verifica se o elemento clicado (ou seu pai) é um botão de exclusão
        const deleteButton = event.target.closest('.delete-btn');
        if (deleteButton) {
            const tickerParaRemover = deleteButton.dataset.ticker;

            // Filtra o array, mantendo apenas os ativos que NÃO têm o ticker a ser removido
            ativos = ativos.filter(ativo => ativo.ticker !== tickerParaRemover);

            // Re-renderiza a lista para refletir a remoção
            renderAtivos();
        }
    });

    // Event listener para o envio do formulário de adição de ativo
    addAssetForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Previne o recarregamento da página

        const tickerInput = document.getElementById('ticker-input');
        const classSelect = document.getElementById('class-select');

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
            console.warn(error); // Apenas loga o aviso no console
        } finally {
            ativos.push(novoAtivo); // Adiciona o ativo ao array (com ou sem dados da API)
            renderAtivos(); // Re-renderiza a lista
            addAssetModal.hide(); // Esconde o modal
            addAssetForm.reset(); // Limpa o formulário
        }
    });

    // Renderiza a lista inicial de ativos quando a página carrega
    renderAtivos();
});