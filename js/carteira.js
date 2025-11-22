import { formatCurrency, showAlert } from './utils.js';
import * as api from './apiService.js'; // Importa nosso novo módulo de serviço
import * as store from './store.js'; // Importa o novo store

export const initCarteira = () => {
    // Seleciona os elementos do DOM
    const carteiraContent = document.querySelector('#carteira-content');
    const transactionModalEl = document.getElementById('portfolioTransactionModal');
    const transactionModal = new bootstrap.Modal(transactionModalEl);
    const assetSelect = document.getElementById('portfolio-asset-select');
    const transactionForm = document.getElementById('portfolio-transaction-form');
    const modalTitle = document.getElementById('portfolioTransactionModalLabel');
    const submitBtn = document.getElementById('portfolio-submit-btn');
    const contextInfo = document.getElementById('transaction-context-info');

    /**
     * Busca os dados mais recentes da carteira do back-end e atualiza o estado local.
     * Esta função será a única fonte da verdade para o histórico da carteira.
     */
    const refreshHistoricoCarteira = async () => {
        try {
            const historico = await api.fetchHistoricoCarteira();
            store.setState({ historicoCarteira: historico });

        } catch (error) {
            console.warn(`AVISO: Falha ao atualizar o histórico da carteira do back-end (${error.message}). A aplicação continuará com os dados locais.`);
        }
    };

    /**
     * Carrega o estado inicial da carteira e renderiza pela primeira vez.
     */
    const loadInitialCarteira = async () => {
        carteiraContent.innerHTML = `<p class="text-center text-muted mt-3">Carregando carteira...</p>`;
        
        await refreshHistoricoCarteira();
    };

    /**
     * Renderiza a seção da carteira.
     * Inicialmente, exibe uma mensagem se nenhum ativo for encontrado.
     */
    const renderCarteira = () => {
        const historicoCompletoCarteira = store.getHistoricoCarteira();

        const ativosCadastrados = store.getAtivos();

        const carteira = historicoCompletoCarteira
            .filter(posicaoApi => parseFloat(posicaoApi.qtd_carteira) > 0) // Filtra apenas posições com quantidade > 0
            .map(posicaoApi => {
                const ativoInfo = ativosCadastrados.find(a => a.ticker === posicaoApi.ticker) || {};
                return {
                    ...ativoInfo,
                    ticker: posicaoApi.ticker,
                    classe_b3: ativoInfo.classe_b3, // Adiciona explicitamente a classe do ativo
                    quantidade: parseFloat(posicaoApi.qtd_carteira),
                    custoTotal: parseFloat(posicaoApi.total_investido),
                    lucroInvestimento: parseFloat(posicaoApi.lucro_investimento || 0)
                };
            });

        carteiraContent.innerHTML = '';

        if (carteira.length === 0) {
            carteiraContent.innerHTML = '<p class="text-center text-muted mt-3">Nenhum ativo na carteira.</p>';
            return;
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
                        PM: ${formatCurrency(precoMedio)}
                    </span>
                    <div>
                        <small class="text-muted">Total: ${formatCurrency(posicao.custoTotal)}</small>
                    </div>
                </div>
            `;

            listGroup.appendChild(listItem);
        });

        carteiraContent.appendChild(listGroup);

    };

    /**
     * Atualiza a aparência do modal (título, cor do botão) com base no tipo de operação.
     * @param {string} tipoOperacao 'compra' ou 'venda'.
     */
    const updateTransactionModalUI = (tipoOperacao) => {
        if (tipoOperacao === 'compra') {
            modalTitle.textContent = 'Registrar Compra';
            submitBtn.textContent = 'Registrar Compra';
            submitBtn.classList.remove('btn-danger');
            submitBtn.classList.add('btn-primary');
        } else {
            modalTitle.textContent = 'Registrar Venda';
            submitBtn.textContent = 'Registrar Venda';
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('btn-danger');
        }
        // Limpa as informações de contexto ao trocar de aba
        contextInfo.innerHTML = '';
    };

    /**
     * Exibe informações contextuais no modal, como a quantidade de ativos que o usuário possui.
     */
    const showContextualInfo = () => {
        const tipoOperacao = document.querySelector('input[name="portfolioTransactionType"]:checked').value;
        const ticker = assetSelect.value;
        const quantidadeInput = document.getElementById('portfolio-quantity-input');

        // Limpa o campo e a validação anterior
        contextInfo.innerHTML = '';
        quantidadeInput.removeAttribute('max');

        if (tipoOperacao === 'venda' && ticker) {
            const posicao = getCarteiraFiltrada().find(p => p.ticker === ticker);
            if (posicao) {
                const precoMedio = posicao.custoTotal / posicao.quantidade;
                contextInfo.innerHTML = `Você possui <strong>${posicao.quantidade}</strong> cotas a um preço médio de <strong>${formatCurrency(precoMedio)}</strong>.`;
                
                // Adiciona validação de 'max' ao campo de quantidade para não vender mais do que tem
                quantidadeInput.setAttribute('max', posicao.quantidade);
            }
        }
    };

    /**
     * Helper para obter a carteira filtrada (apenas posições > 0) a partir do store.
     * @returns {Array}
     */
    const getCarteiraFiltrada = () => {
        const historico = store.getHistoricoCarteira();
        const ativos = store.getAtivos();
        return historico
            .filter(p => parseFloat(p.qtd_carteira) > 0)
            .map(p => ({
                ...ativos.find(a => a.ticker === p.ticker), // Pega dados como nome, classe
                ...p, // Sobrescreve com os dados da carteira (qtd, custo, etc.)
                quantidade: parseFloat(p.qtd_carteira),
                custoTotal: parseFloat(p.total_investido),
            }));
    };

    /**
     * Preenche o seletor de ativos no modal de transação com os ativos cadastrados.
     */
    const popularSeletorDeAtivos = () => {
        const tipoOperacao = document.querySelector('input[name="portfolioTransactionType"]:checked').value;

        let listaDeAtivos;
        let mensagemVazio;

        if (tipoOperacao === 'compra') {
            // Para COMPRA, usa todos os ativos cadastrados
            listaDeAtivos = store.getAtivos();
            mensagemVazio = 'Nenhum ativo cadastrado';
        } else {
            // Para VENDA, usa apenas os ativos da carteira
            listaDeAtivos = getCarteiraFiltrada();
            mensagemVazio = 'Nenhum ativo na carteira para vender';
        }

        assetSelect.innerHTML = '<option selected disabled value="">Selecione...</option>';
        
        if (listaDeAtivos.length === 0) {
            assetSelect.innerHTML = `<option selected disabled value="">${mensagemVazio}</option>`;
        } else {
            
            listaDeAtivos.forEach(ativo => {
                const option = new Option(`${ativo.ticker} (${ativo.classe_b3})`, ativo.ticker);
                assetSelect.add(option);
            });
        }

        // Atualiza a UI do modal (cores e textos)
        updateTransactionModalUI(tipoOperacao);

        // Atualiza as informações contextuais (se for venda)
        showContextualInfo();
    };

    /**
     * Função pura que calcula o resultado de uma operação de compra ou venda.
     * Não tem efeitos colaterais (não modifica o DOM ou o store).
     * @param {object} operacao - Dados da operação { tipo, ticker, quantidade, preco }.
     * @param {Array} carteiraAtual - A carteira atual filtrada.
     * @param {Array} historicoAtual - O histórico completo da carteira.
     * @returns {object} Um objeto com os dados calculados para a API.
     */
    const calcularResultadoOperacao = (operacao, carteiraAtual, historicoAtual) => {
        const { tipo, ticker, quantidade, preco } = operacao;

        const quantidadeDec = new Decimal(quantidade);
        const precoDec = new Decimal(preco);
        const totalOperacaoDec = quantidadeDec.times(precoDec);

        let precoMedioParaApi = 0;
        let totalInvestidoParaApi = 0;
        let lucroOperacaoParaApi = 0;
        let lucroInvestimentoParaApi = 0;
        let qtdCarteiraParaApi = 0;

        if (tipo === 'compra') {
            const posicaoExistente = carteiraAtual.find(p => p.ticker === ticker);
            const posicaoHistorica = historicoAtual.find(p => p.ticker === ticker);

            if (posicaoExistente) {
                const custoTotalAnteriorDec = new Decimal(posicaoExistente.custoTotal);
                const quantidadeAnteriorDec = new Decimal(posicaoExistente.quantidade);
                const novoCustoTotalDec = custoTotalAnteriorDec.plus(totalOperacaoDec);
                const novaQuantidadeDec = quantidadeAnteriorDec.plus(quantidadeDec);

                precoMedioParaApi = novoCustoTotalDec.dividedBy(novaQuantidadeDec).toDP(8).toNumber();
                totalInvestidoParaApi = novoCustoTotalDec.toDP(2).toNumber();
                qtdCarteiraParaApi = novaQuantidadeDec.toNumber();
                lucroInvestimentoParaApi = posicaoHistorica ? parseFloat(posicaoHistorica.lucro_investimento || 0) : 0;
            } else {
                const lucroAnterior = posicaoHistorica ? parseFloat(posicaoHistorica.lucro_investimento || 0) : 0;
                precoMedioParaApi = precoDec.toDP(8).toNumber();
                totalInvestidoParaApi = totalOperacaoDec.toDP(2).toNumber();
                qtdCarteiraParaApi = quantidade;
                lucroInvestimentoParaApi = lucroAnterior;
            }
        } else if (tipo === 'venda') {
            const posicaoExistente = carteiraAtual.find(p => p.ticker === ticker);

            if (!posicaoExistente || !posicaoExistente.quantidade) {
                throw new Error(`Operação inválida. Você não possui o ativo ${ticker} em carteira.`);
            }
            if (quantidade > posicaoExistente.quantidade) {
                throw new Error(`Operação inválida. Você está tentando vender ${quantidade} cotas, mas possui apenas ${posicaoExistente.quantidade}.`);
            }

            const custoTotalDec = new Decimal(posicaoExistente.custoTotal);
            const quantidadeDecExistente = new Decimal(posicaoExistente.quantidade);
            const precoMedioDec = custoTotalDec.dividedBy(quantidadeDecExistente);
            precoMedioParaApi = precoMedioDec.toDP(8).toNumber();

            const lucroOperacaoDec = precoDec.minus(precoMedioDec).times(quantidadeDec);
            lucroOperacaoParaApi = lucroOperacaoDec.toDP(2).toNumber();

            const lucroAnteriorDec = new Decimal(posicaoExistente.lucroInvestimento || 0);
            const novoLucroTotalAtivoDec = lucroAnteriorDec.plus(lucroOperacaoDec);
            lucroInvestimentoParaApi = novoLucroTotalAtivoDec.toDP(2).toNumber();

            const novaQuantidade = quantidadeDecExistente.minus(quantidadeDec).toNumber();
            qtdCarteiraParaApi = novaQuantidade;

            if (novaQuantidade === 0) {
                totalInvestidoParaApi = 0;
            } else {
                totalInvestidoParaApi = new Decimal(novaQuantidade).times(precoMedioDec).toDP(2).toNumber();
            }
        }

        return {
            precoMedioParaApi,
            totalInvestidoParaApi,
            lucroOperacaoParaApi,
            lucroInvestimentoParaApi,
            qtdCarteiraParaApi,
            totalOperacaoDec,
            precoDec
        };
    };

    /**
     * Prepara o objeto FormData para ser enviado à API de movimentações.
     * @param {object} dadosCalculados - O resultado da função calcularResultadoOperacao.
     * @param {string} tipoOperacao - 'compra' ou 'venda'.
     * @param {string} ticker - O ticker do ativo.
     * @param {number} quantidade - A quantidade da operação.
     * @returns {FormData}
     */
    const prepararFormDataMovimentacao = (dadosCalculados, tipoOperacao, ticker, quantidade) => {
        const formData = new FormData();
        formData.append('movimento', tipoOperacao === 'compra' ? 'Compra' : 'Venda');
        formData.append('preco_medio', dadosCalculados.precoMedioParaApi);
        formData.append('qtd_operacao', quantidade);
        formData.append('qtd_carteira', dadosCalculados.qtdCarteiraParaApi);
        formData.append('ticker', ticker);
        formData.append('valor', dadosCalculados.precoDec.toNumber());
        formData.append('total_operacao', dadosCalculados.totalOperacaoDec.toNumber());
        formData.append('total_investido', dadosCalculados.totalInvestidoParaApi);
        formData.append('lucro_operacao', dadosCalculados.lucroOperacaoParaApi);
        formData.append('lucro_investimento', dadosCalculados.lucroInvestimentoParaApi);
        return formData;
    };

    /**
     * Processa o formulário de transação para compra ou venda de ativos.
     */
    const handleTransactionSubmit = async (event) => {
        event.preventDefault();

        const tipoOperacao = new FormData(transactionForm).get('portfolioTransactionType');
        const ticker = assetSelect.value;
        const quantidade = parseFloat(document.getElementById('portfolio-quantity-input').value);
        const precoInput = document.getElementById('portfolio-price-input').value;

        // Validação simples
        if (!ticker || !quantidade || !precoInput || quantidade <= 0 || parseFloat(precoInput) <= 0) {
            showAlert('Por favor, preencha todos os campos corretamente.', 'warning'); 
            return;
        }

        try {
            // 1. Pega o estado atual do store
            const carteiraAtual = getCarteiraFiltrada();
            const historicoAtual = store.getHistoricoCarteira();

            // 2. Chama a função pura de cálculo
            const dadosCalculados = calcularResultadoOperacao(
                { tipo: tipoOperacao, ticker, quantidade, preco: precoInput },
                carteiraAtual,
                historicoAtual
            );

            // 3. Prepara o FormData para a API
            const formData = prepararFormDataMovimentacao(dadosCalculados, tipoOperacao, ticker, quantidade);

            // 4. Tenta enviar para a API
            await api.postMovimentacao(formData);
            console.log('Movimentação registrada com sucesso no back-end.');

            // ATUALIZA o histórico local com os dados mais recentes do servidor.
            await refreshHistoricoCarteira();
        } catch (error) {
            // Se a API falhou, ou se a validação na função de cálculo falhou
            if (error.message.startsWith('Operação inválida')) {
                showAlert(error.message, 'danger');
            } else {
                console.warn(`AVISO: ${error.message} A operação será registrada apenas localmente.`);
                
                // --- LÓGICA PARA MODO OFFLINE ---                
                const historicoAtualClone = [...store.getHistoricoCarteira()];
                const posicaoNoHistorico = historicoAtualClone.find(p => p.ticker === ticker);
                
                // Recalcula os dados para garantir que temos o estado correto para atualizar localmente
                const dadosCalculados = calcularResultadoOperacao(
                    { tipo: tipoOperacao, ticker, quantidade, preco: precoInput },
                    getCarteiraFiltrada(), // Usa a carteira antes da operação
                    historicoAtualClone   // Usa o histórico antes da operação
                );
    
                if (posicaoNoHistorico) {
                    posicaoNoHistorico.qtd_carteira = dadosCalculados.qtdCarteiraParaApi;
                    posicaoNoHistorico.total_investido = dadosCalculados.totalInvestidoParaApi;
                    posicaoNoHistorico.lucro_investimento = dadosCalculados.lucroInvestimentoParaApi;
                } else {
                    historicoAtualClone.push({
                        ticker: ticker,
                        qtd_carteira: dadosCalculados.qtdCarteiraParaApi,
                        total_investido: dadosCalculados.totalInvestidoParaApi,
                        lucro_investimento: dadosCalculados.lucroInvestimentoParaApi
                    });
                }
                store.setState({ historicoCarteira: historicoAtualClone });
            }
        }

        transactionForm.reset();
        transactionModal.hide();
 
        // Remove o foco do botão de submit para evitar o aviso de acessibilidade "descendant retained focus"
        event.submitter.blur(); 

    };

    // Adiciona um listener para popular o seletor toda vez que o modal for aberto
    transactionModalEl.addEventListener('show.bs.modal', () => {
        // Garante que a aba de compra esteja selecionada por padrão ao abrir
        document.getElementById('buy-radio').checked = true;
        popularSeletorDeAtivos();
    });

    // Adiciona listeners para os botões de rádio (Compra/Venda)
    // para atualizar o dropdown dinamicamente quando o tipo de operação muda.
    document.querySelectorAll('input[name="portfolioTransactionType"]').forEach(radio => radio.addEventListener('change', popularSeletorDeAtivos));

    // Adiciona um listener para o seletor de ativos para mostrar info contextual
    assetSelect.addEventListener('change', showContextualInfo);

    // Adiciona um listener para o envio do formulário de transação
    transactionForm.addEventListener('submit', handleTransactionSubmit);

    // Adiciona um listener para o evento 'hide.bs.modal', que dispara ANTES do modal ser ocultado.
    // Isso resolve o aviso de acessibilidade "descendant retained focus" de forma definitiva,
    // removendo o foco do elemento ativo (ex: botão "Cancelar") antes que o modal seja marcado como oculto.
    transactionModalEl.addEventListener('hide.bs.modal', () => {
        if (document.activeElement && transactionModalEl.contains(document.activeElement)) {
            document.activeElement.blur();
        }
    });

    // Inscreve a função de renderização no store.
    store.subscribe(renderCarteira);

    return loadInitialCarteira();
};