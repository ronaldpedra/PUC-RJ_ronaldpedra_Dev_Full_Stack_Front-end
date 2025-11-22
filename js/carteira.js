export const initCarteira = () => {
    // Seleciona os elementos do DOM
    const carteiraContent = document.querySelector('#carteira-content');
    const transactionModalEl = document.getElementById('portfolioTransactionModal');
    const transactionModal = new bootstrap.Modal(transactionModalEl);
    const assetSelect = document.getElementById('portfolio-asset-select');
    const transactionForm = document.getElementById('portfolio-transaction-form');

    // "Banco de dados" local da carteira
    let carteira = [];
    // Armazena a lista completa da API, incluindo ativos com qtd 0, para preservar o histórico de lucro.
    let historicoCompletoCarteira = [];
    // Variável para acumular o resultado de todas as vendas
    let lucroPrejuizoRealizado = 0;
    // Lista de "ouvintes" que serão notificados quando a carteira for atualizada
    const portfolioUpdateListeners = [];

    // Expõe funções para outros módulos poderem interagir com os dados da carteira
    window.getCarteira = () => carteira;
    window.getLucroPrejuizo = () => lucroPrejuizoRealizado;
    window.addPortfolioUpdateListener = (listener) => {
        portfolioUpdateListeners.push(listener);
    };

    /**
     * Busca os dados mais recentes da carteira do back-end e atualiza o estado local.
     * Esta função será a única fonte da verdade para o histórico da carteira.
     */
    const refreshHistoricoCarteira = async () => {
        try {
            const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/movimentacoes/carteira`);
            if (!response.ok) {
                throw new Error(`Erro na rede: ${response.statusText}`);
            }
            const data = await response.json();
            historicoCompletoCarteira = data.carteira || []; // Atualiza o histórico completo
            console.log('Histórico da carteira atualizado:', historicoCompletoCarteira);

            // Recalcula o lucro/prejuízo total com base nos novos dados
            lucroPrejuizoRealizado = historicoCompletoCarteira.reduce((total, posicao) => {
                return total + parseFloat(posicao.lucro_investimento || 0);
            }, 0);

        } catch (error) {
            console.warn(`AVISO: Falha ao atualizar o histórico da carteira do back-end (${error.message}). A aplicação continuará com os dados locais.`);
            // Em caso de falha, não fazemos nada, mantendo o estado local atual.
        }
    };

    /**
     * Carrega o estado inicial da carteira e renderiza pela primeira vez.
     */
    const loadInitialCarteira = async () => {
        carteiraContent.innerHTML = `<p class="text-center text-muted mt-3">Carregando carteira...</p>`;
        
        // Busca os dados iniciais
        await refreshHistoricoCarteira();

        // Se o histórico veio vazio, encerra.
        if (historicoCompletoCarteira.length === 0) {
            console.log('Carteira vazia recebida do back-end.');
            return;
        }
    };

    /**
     * Renderiza a seção da carteira.
     * Inicialmente, exibe uma mensagem se nenhum ativo for encontrado.
     */
    const renderCarteira = () => {
        // Notifica os "ouvintes" PRIMEIRO para que outros componentes (como o Resumo) possam se atualizar
        portfolioUpdateListeners.forEach(listener => listener());

        // A variável 'carteira' (para exibição) agora é derivada do histórico completo toda vez que renderizamos.
        const ativosCadastrados = window.getAtivos ? window.getAtivos() : [];
        carteira = historicoCompletoCarteira
            .filter(posicaoApi => parseFloat(posicaoApi.qtd_carteira) > 0) // Filtra apenas posições com quantidade > 0
            .map(posicaoApi => {
                const ativoInfo = ativosCadastrados.find(a => a.ticker === posicaoApi.ticker) || {};
                return {
                    ...ativoInfo,
                    ticker: posicaoApi.ticker,
                    quantidade: parseFloat(posicaoApi.qtd_carteira),
                    custoTotal: parseFloat(posicaoApi.total_investido),
                    lucroInvestimento: parseFloat(posicaoApi.lucro_investimento || 0)
                };
            });

        // Limpa o conteúdo atual
        carteiraContent.innerHTML = '';

        if (carteira.length === 0) { // Se a carteira estiver vazia
            carteiraContent.innerHTML = '<p class="text-center text-muted mt-3">Nenhum ativo na carteira.</p>';
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
        // Verifica qual tipo de operação está selecionada
        const tipoOperacao = document.querySelector('input[name="portfolioTransactionType"]:checked').value;

        let listaDeAtivos;
        let mensagemVazio;

        if (tipoOperacao === 'compra') {
            // Para COMPRA, usa todos os ativos cadastrados
            listaDeAtivos = window.getAtivos ? window.getAtivos() : [];
            mensagemVazio = 'Nenhum ativo cadastrado';
        } else {
            // Para VENDA, usa apenas os ativos da carteira
            listaDeAtivos = window.getCarteira ? window.getCarteira() : [];
            mensagemVazio = 'Nenhum ativo na carteira para vender';
        }

        assetSelect.innerHTML = '<option selected disabled value="">Selecione...</option>'; // Limpa e adiciona a opção padrão

        if (listaDeAtivos.length === 0) {
            assetSelect.innerHTML = `<option selected disabled value="">${mensagemVazio}</option>`;
        } else {
            listaDeAtivos.forEach(ativo => {
                const option = new Option(`${ativo.ticker} (${ativo.classe_b3})`, ativo.ticker);
                assetSelect.add(option);
            });
        }
    };

    /**
     * Processa o formulário de transação para compra ou venda de ativos.
     */
    const handleTransactionSubmit = async (event) => {
        event.preventDefault(); // Previne o recarregamento da página

        // Captura os dados do formulário
        const tipoOperacao = new FormData(transactionForm).get('portfolioTransactionType');
        const ticker = assetSelect.value;
        const quantidade = parseFloat(document.getElementById('portfolio-quantity-input').value);
        const precoInput = document.getElementById('portfolio-price-input').value;

        // Validação simples
        if (!ticker || !quantidade || !precoInput || quantidade <= 0 || parseFloat(precoInput) <= 0) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        // --- CÁLCULO PRECISO COM DECIMAL.JS ---
        // Converte os inputs para o tipo Decimal para garantir a precisão
        const quantidadeDec = new Decimal(quantidade);
        const precoDec = new Decimal(precoInput);
        const totalOperacaoDec = quantidadeDec.times(precoDec); // Usa .times() em vez de '*'

        // --- PREPARAÇÃO DOS DADOS PARA O BACK-END ---
        let precoMedioParaApi = 0;
        let totalInvestidoParaApi = 0;
        let lucroOperacaoParaApi = 0;
        let lucroInvestimentoParaApi = 0;
        let qtdCarteiraParaApi = 0; // Novo campo para a quantidade final em carteira

        if (tipoOperacao === 'compra') {
            // Procura na carteira ATUAL (apenas ativos com qtd > 0)
            const posicaoExistente = carteira.find(p => p.ticker === ticker);
            // Procura no histórico COMPLETO para encontrar o lucro de um ativo que pode ter sido zerado
            const posicaoHistorica = historicoCompletoCarteira.find(p => p.ticker === ticker);
            console.log(posicaoExistente || 'Nenhuma posição encontrada')
            if (posicaoExistente) {
                // Se já tem o ativo, atualiza a posição
                const custoTotalAnteriorDec = new Decimal(posicaoExistente.custoTotal);
                const quantidadeAnteriorDec = new Decimal(posicaoExistente.quantidade);

                const novoCustoTotalDec = custoTotalAnteriorDec.plus(totalOperacaoDec); // .plus() em vez de '+'
                const novaQuantidadeDec = quantidadeAnteriorDec.plus(quantidadeDec);

                posicaoExistente.custoTotal = novoCustoTotalDec.toNumber(); // Armazena como número
                posicaoExistente.quantidade = novaQuantidadeDec.toNumber();
                precoMedioParaApi = novoCustoTotalDec.dividedBy(novaQuantidadeDec).toDP(8).toNumber(); // .dividedBy() em vez de '/' e define 8 casas decimais
                totalInvestidoParaApi = novoCustoTotalDec.toDP(2).toNumber(); // Arredonda para 2 casas decimais
                qtdCarteiraParaApi = posicaoExistente.quantidade; // A quantidade final é a nova quantidade
                // Na compra, o lucro realizado do ativo não muda. Apenas o reenviamos.
                lucroInvestimentoParaApi = posicaoHistorica ? parseFloat(posicaoHistorica.lucro_investimento || 0) : 0;
            } else {
                // Se não tem, adiciona uma nova posição
                // Busca a informação completa do ativo para incluir a classe na carteira
                const ativoInfo = window.getAtivos().find(a => a.ticker === ticker);
                if (!ativoInfo) { // Validação de segurança
                    alert(`Erro: Não foi possível encontrar as informações do ativo ${ticker}. A operação foi cancelada.`);
                    return;
                }
                // Pega o lucro histórico, se houver. Se não, é 0.
                const lucroAnterior = posicaoHistorica ? parseFloat(posicaoHistorica.lucro_investimento || 0) : 0;

                carteira.push({
                    ...ativoInfo, // Inclui todas as propriedades do ativo (ticker, nome, classe_b3)
                    quantidade: quantidade,
                    custoTotal: totalOperacaoDec.toNumber(),
                    lucroInvestimento: lucroAnterior // Persiste o lucro anterior
                });
                precoMedioParaApi = precoDec.toDP(8).toNumber();
                totalInvestidoParaApi = totalOperacaoDec.toDP(2).toNumber(); // Arredonda para 2 casas decimais
                qtdCarteiraParaApi = quantidade; // A quantidade final é a quantidade da primeira compra
                lucroInvestimentoParaApi = lucroAnterior; // Envia o lucro anterior para a API
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

            // Calcula o preço médio com precisão
            const custoTotalDec = new Decimal(posicaoExistente.custoTotal);
            const quantidadeDecExistente = new Decimal(posicaoExistente.quantidade);
            const precoMedioDec = custoTotalDec.dividedBy(quantidadeDecExistente);
            precoMedioParaApi = precoMedioDec.toDP(8).toNumber();

            // Calcula o lucro/prejuízo desta operação de venda
            const lucroOperacaoDec = precoDec.minus(precoMedioDec).times(quantidadeDec);
            lucroOperacaoParaApi = lucroOperacaoDec.toDP(2).toNumber(); // Arredonda para 2 casas para o registro da operação

            // Pega o lucro que o ativo já tinha e soma com o da operação atual
            const lucroAnteriorDec = new Decimal(posicaoExistente.lucroInvestimento || 0);
            const novoLucroTotalAtivoDec = lucroAnteriorDec.plus(lucroOperacaoDec);

            posicaoExistente.lucroInvestimento = novoLucroTotalAtivoDec.toNumber(); // Atualiza o estado local
            lucroInvestimentoParaApi = novoLucroTotalAtivoDec.toDP(2).toNumber(); // Prepara para enviar à API

            // Diminui a quantidade
            posicaoExistente.quantidade = quantidadeDecExistente.minus(quantidadeDec).toNumber();

            if (posicaoExistente.quantidade === 0) {
                // Se a quantidade zerar, remove o ativo da carteira
                carteira = carteira.filter(p => p.ticker !== ticker);
                totalInvestidoParaApi = 0;
            } else {
                // Se ainda houver cotas, recalcula o custo total para manter o preço médio
                // Custo Total = Nova Quantidade * Preço Médio Antigo
                posicaoExistente.custoTotal = new Decimal(posicaoExistente.quantidade).times(precoMedioDec).toDP(8).toNumber(); // Mantém precisão interna maior
                totalInvestidoParaApi = new Decimal(posicaoExistente.custoTotal).toDP(2).toNumber(); // Arredonda para 2 casas para a API
            }
            qtdCarteiraParaApi = posicaoExistente.quantidade; // A quantidade final é a quantidade restante
            // Adiciona o resultado da operação ao acumulador global de lucro/prejuízo.
            lucroPrejuizoRealizado = new Decimal(lucroPrejuizoRealizado).plus(lucroOperacaoDec).toNumber();
        }

        // Prepara os dados para enviar ao back-end
        const formData = new FormData();
        formData.append('movimento', tipoOperacao === 'compra' ? 'Compra' : 'Venda');
        formData.append('preco_medio', precoMedioParaApi);
        formData.append('qtd_operacao', quantidade); // Campo 'quantidade' renomeado para 'qtd_operacao'
        formData.append('qtd_carteira', qtdCarteiraParaApi); // Novo campo com a quantidade final
        formData.append('ticker', ticker);
        formData.append('valor', precoDec.toNumber()); // Preço unitário da operação
        formData.append('total_operacao', totalOperacaoDec.toNumber()); // Substitui 'valor_total'
        formData.append('total_investido', totalInvestidoParaApi);
        formData.append('lucro_operacao', lucroOperacaoParaApi);
        formData.append('lucro_investimento', lucroInvestimentoParaApi);

        // Adicione isso antes do try...catch do fetch em handleTransactionSubmit
        for (var pair of formData.entries()) {
            console.log(pair[0]+ ': ' + pair[1]);
        }
        

        try {
            const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/movimentacoes`, { // A rota da API
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Falha ao registrar a movimentação no servidor.');
            }
            console.log('Movimentação registrada com sucesso no back-end.');

            // ATUALIZA o histórico local com os dados mais recentes do servidor.
            await refreshHistoricoCarteira();
        } catch (error) {
            console.warn(`AVISO: ${error.message} A operação foi registrada apenas localmente.`);
            // --- LÓGICA PARA MODO OFFLINE ---
            // Se a API falhou, atualizamos o histórico local manualmente.
            const posicaoNoHistorico = historicoCompletoCarteira.find(p => p.ticker === ticker);

            const dadosParaHistorico = {
                ticker: ticker,
                qtd_carteira: qtdCarteiraParaApi,
                total_investido: totalInvestidoParaApi,
                lucro_investimento: lucroInvestimentoParaApi,
                // Mantém outros campos que a API normalmente retornaria, se existirem
                ...(posicaoNoHistorico || {})
            };

            if (posicaoNoHistorico) {
                Object.assign(posicaoNoHistorico, dadosParaHistorico);
            } else {
                historicoCompletoCarteira.push(dadosParaHistorico);
            }
        }

        transactionForm.reset(); // Limpa o formulário para a próxima operação
        renderCarteira(); // Atualiza a exibição da carteira
        transactionModal.hide(); // Fecha o modal

        // Remove o foco do botão de submit para evitar problemas de acessibilidade com o modal oculto
        event.submitter.blur();

    };

    // Adiciona um listener para popular o seletor toda vez que o modal for aberto
    transactionModalEl.addEventListener('show.bs.modal', popularSeletorDeAtivos);

    // Adiciona listeners para os botões de rádio (Compra/Venda)
    // para atualizar o dropdown dinamicamente quando o tipo de operação muda.
    document.querySelectorAll('input[name="portfolioTransactionType"]').forEach(radio => {
        radio.addEventListener('change', popularSeletorDeAtivos);
    });

    // Adiciona um listener para o envio do formulário de transação
    transactionForm.addEventListener('submit', handleTransactionSubmit);

    /**
     * Função de inicialização principal para o módulo da carteira.
     */
    const init = async () => {
        await loadInitialCarteira(); // Carrega os dados do back-end
        renderCarteira(); // Renderiza a carteira com os dados carregados (ou vazia, se falhar)
    };

    // Inicia o módulo
    // Retorna a promise da inicialização para que o chamador possa esperar.
    return init();
};