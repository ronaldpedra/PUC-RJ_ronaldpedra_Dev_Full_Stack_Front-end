export const initCarteira = () => {
    // Seleciona os elementos do DOM
    const carteiraContent = document.querySelector('#carteira-content');
    const transactionModalEl = document.getElementById('portfolioTransactionModal');
    const transactionModal = new bootstrap.Modal(transactionModalEl);
    const assetSelect = document.getElementById('portfolio-asset-select');
    const transactionForm = document.getElementById('portfolio-transaction-form');

    // "Banco de dados" da carteira
    let carteira = [];
    // Lista de "ouvintes" que serão notificados quando a carteira for atualizada
    const portfolioUpdateListeners = [];

    // Expõe funções para outros módulos poderem interagir com os dados da carteira
    window.getCarteira = () => carteira;
    window.addPortfolioUpdateListener = (listener) => {
        portfolioUpdateListeners.push(listener);
    };

    /**
     * Renderiza a seção da carteira.
     * Inicialmente, exibe uma mensagem se nenhum ativo for encontrado.
     */
    const renderCarteira = () => {
        // Limpa o conteúdo atual
        carteiraContent.innerHTML = '';

        if (carteira.length === 0) {
            carteiraContent.innerHTML = '<p class="text-center">Nenhum ativo na carteira.</p>';
            return; // Encerra a função aqui se a carteira estiver vazia
        }

        // Se houver ativos, cria e renderiza a lista
        const listGroup = document.createElement('ul');
        listGroup.className = 'list-group list-group-flush';

        carteira.forEach(posicao => {
            // Calcula o preço médio para exibição
            const precoMedio = posicao.custoTotal / posicao.quantidade;

            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';

            // Define o HTML interno para cada item da lista
            listItem.innerHTML = `
                <div class="me-auto">
                    <span class="fw-bold">${posicao.ticker}</span>
                    <small class="text-muted"> - ${posicao.quantidade} cotas</small>
                </div>
                <div class="text-end">
                    <span class="badge bg-primary rounded-pill">
                        PM: R$ ${precoMedio.toFixed(2)}
                    </span>
                    <div>
                        <small class="text-muted">Total: R$ ${posicao.custoTotal.toFixed(2)}</small>
                    </div>
                </div>
            `;

            listGroup.appendChild(listItem);
        });

        carteiraContent.appendChild(listGroup);
    };

    /**
     * Preenche o seletor de ativos no modal de transação com os ativos cadastrados.
     */
    const popularSeletorDeAtivos = () => {
        const ativosCadastrados = window.getAtivos ? window.getAtivos() : [];
        assetSelect.innerHTML = '<option selected disabled value="">Selecione...</option>'; // Limpa e adiciona a opção padrão

        if (ativosCadastrados.length === 0) {
            assetSelect.innerHTML = '<option selected disabled value="">Nenhum ativo cadastrado</option>';
        } else {
            ativosCadastrados.forEach(ativo => {
                const option = new Option(`${ativo.ticker} (${ativo.classe})`, ativo.ticker);
                assetSelect.add(option);
            });
        }
    };

    /**
     * Processa o formulário de transação para compra ou venda de ativos.
     */
    const handleTransactionSubmit = (event) => {
        event.preventDefault(); // Previne o recarregamento da página

        // Captura os dados do formulário
        const tipoOperacao = new FormData(transactionForm).get('portfolioTransactionType');
        const ticker = assetSelect.value;
        const quantidade = parseFloat(document.getElementById('portfolio-quantity-input').value);
        const preco = parseFloat(document.getElementById('portfolio-price-input').value);

        // Validação simples
        if (!ticker || !quantidade || !preco || quantidade <= 0 || preco <= 0) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        if (tipoOperacao === 'compra') {
            const posicaoExistente = carteira.find(p => p.ticker === ticker);

            if (posicaoExistente) {
                // Se já tem o ativo, atualiza a posição
                posicaoExistente.quantidade += quantidade;
                posicaoExistente.custoTotal += quantidade * preco;
            } else {
                // Se não tem, adiciona uma nova posição
                carteira.push({
                    ticker: ticker,
                    quantidade: quantidade,
                    custoTotal: quantidade * preco,
                });
            }
        } else if (tipoOperacao === 'venda') {
            const posicaoExistente = carteira.find(p => p.ticker === ticker);

            // Validação: não pode vender um ativo que não possui
            if (!posicaoExistente) {
                alert(`Operação inválida. Você não possui o ativo ${ticker} em carteira.`);
                return;
            }

            // Validação: não pode vender mais do que possui
            if (quantidade > posicaoExistente.quantidade) {
                alert(`Operação inválida. Você está tentando vender ${quantidade} cotas de ${ticker}, mas possui apenas ${posicaoExistente.quantidade}.`);
                return;
            }

            // Mantém o preço médio original antes de qualquer alteração
            const precoMedio = posicaoExistente.custoTotal / posicaoExistente.quantidade;

            // Diminui a quantidade
            posicaoExistente.quantidade -= quantidade;

            if (posicaoExistente.quantidade === 0) {
                // Se a quantidade zerar, remove o ativo da carteira
                carteira = carteira.filter(p => p.ticker !== ticker);
            } else {
                // Se ainda houver cotas, recalcula o custo total para manter o preço médio
                posicaoExistente.custoTotal = posicaoExistente.quantidade * precoMedio;
            }
        }

        transactionForm.reset(); // Limpa o formulário para a próxima operação
        renderCarteira(); // Atualiza a exibição da carteira
        transactionModal.hide(); // Fecha o modal

        // Notifica todos os "ouvintes" que a carteira foi atualizada
        portfolioUpdateListeners.forEach(listener => listener());
    };

    // Adiciona um listener para popular o seletor toda vez que o modal for aberto
    transactionModalEl.addEventListener('show.bs.modal', popularSeletorDeAtivos);

    // Adiciona um listener para o envio do formulário de transação
    transactionForm.addEventListener('submit', handleTransactionSubmit);

    // Renderiza o estado inicial da carteira ao carregar a página
    renderCarteira();
};