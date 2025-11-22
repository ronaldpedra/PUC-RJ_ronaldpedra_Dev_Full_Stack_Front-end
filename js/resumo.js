import { formatCurrency } from './utils.js';
import * as store from './store.js';

export const initResumo = () => {
    // Seleciona os contêineres onde os componentes do resumo serão exibidos
    const resumoIndicadoresContent = document.getElementById('resumo-indicadores');
    const resumoGraficoContainer = document.getElementById('resumo-grafico-container');

    // Variável para manter a instância do gráfico e destruí-la antes de renderizar um novo
    let distributionChart = null;

    /**
     * Renderiza o gráfico de pizza (Doughnut) com a distribuição de ativos.
     * @param {object} resumoPorClasse Dados agregados por classe de ativo.
     */
    const renderDistributionChart = (resumoPorClasse) => {
        // Limpa o contêiner e destrói o gráfico anterior, se existir
        resumoGraficoContainer.innerHTML = '';
        if (distributionChart) {
            distributionChart.destroy();
        }

        // Filtra apenas as classes que têm ativos e prepara os dados para o gráfico
        const labels = Object.keys(resumoPorClasse).filter(classe => resumoPorClasse[classe].count > 0);
        const data = labels.map(classe => resumoPorClasse[classe].total);

        // Se não houver dados para o gráfico, não renderiza nada.
        if (labels.length === 0) {
            return;
        }

        // Adiciona o elemento canvas ao contêiner
        resumoGraficoContainer.innerHTML = '<canvas id="distributionChartCanvas"></canvas>';
        const ctx = document.getElementById('distributionChartCanvas').getContext('2d');

        // Cria o gráfico usando Chart.js
        distributionChart = new Chart(ctx, {
            type: 'doughnut', // Tipo de gráfico: rosca (similar a pizza)
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valor por Classe',
                    data: data,
                    // Cores pré-definidas para as classes de ativos
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.7)',  // Azul para Ações
                        'rgba(255, 99, 132, 0.7)',   // Vermelho para FII
                        'rgba(75, 192, 192, 0.7)',   // Verde para ETF
                        'rgba(255, 206, 86, 0.7)',  // Amarelo para BDR
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 206, 86, 1)',
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top', // Posição da legenda
                    },
                    title: {
                        display: true,
                        text: 'Distribuição por Classe de Ativo' // Título do gráfico
                    }
                }
            }
        });
    };

    /**
     * Calcula e renderiza os principais indicadores do resumo da carteira.
     */
    const renderResumo = () => {
        const historicoCarteira = store.getHistoricoCarteira();
        const ativosCadastrados = store.getAtivos();

        // Deriva a carteira visível (com quantidade > 0)
        const carteira = historicoCarteira
            .filter(p => parseFloat(p.qtd_carteira) > 0)
            .map(p => ({
                ...p,
                custoTotal: parseFloat(p.total_investido),
                quantidade: parseFloat(p.qtd_carteira) // Garante que a quantidade seja um número
            }));

        const lucroPrejuizo = historicoCarteira.reduce((total, p) => total + parseFloat(p.lucro_investimento || 0), 0);

        // Limpa o conteúdo dos indicadores
        resumoIndicadoresContent.innerHTML = '';

        // Só exibe a mensagem de "vazia" se a carteira estiver vazia E não houver histórico de lucro/prejuízo
        if (carteira.length === 0 && lucroPrejuizo === 0) {
            resumoIndicadoresContent.innerHTML = '<p class="text-center text-muted mt-3">A carteira está vazia.</p>';
            // Limpa também o gráfico
            renderDistributionChart({});
            return;
        }

        // 1. Calcula o Valor Total Investido
        const valorTotalInvestido = carteira.reduce((total, posicao) => total + posicao.custoTotal, 0);

        // 2. Calcula o Valor de Mercado Total da Carteira
        const valorDeMercadoTotal = carteira.reduce((total, posicao) => {
            const ativoInfo = ativosCadastrados.find(a => a.ticker === posicao.ticker);
            // Se o ativo correspondente for encontrado e tiver um valor de mercado válido
            if (ativoInfo && typeof ativoInfo.valor === 'number' && typeof posicao.quantidade === 'number') {
                // Multiplica a quantidade de cotas pelo valor de mercado atual do ativo
                return total + (posicao.quantidade * ativoInfo.valor);
            }
            // Se o valor de mercado do ativo ainda não estiver disponível, não adiciona nada ao total.
            return total;
        }, 0);

        // 3. Calcula a diferença (valorização/desvalorização) e a variação percentual
        const diferencaValor = valorDeMercadoTotal - valorTotalInvestido;
        const variacaoPercentual = valorTotalInvestido > 0 ? (diferencaValor / valorTotalInvestido) * 100 : 0;
        const valorizacaoBadgeColor = diferencaValor >= 0 ? 'bg-success' : 'bg-danger';
        const valorizacaoIcon = diferencaValor >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right';

        // 2. Prepara a estrutura para agrupar por classe
        const resumoPorClasse = {
            'Ações': { count: 0, total: 0 },
            'FII': { count: 0, total: 0 },
            'ETF': { count: 0, total: 0 },
            'BDR': { count: 0, total: 0 }
        };
        
        // 3. Processa cada posição da carteira para agrupar por classe
        carteira.forEach(posicao => {
            const ativoInfo = ativosCadastrados.find(a => a.ticker === posicao.ticker);
            if (ativoInfo && resumoPorClasse.hasOwnProperty(ativoInfo.classe_b3)) {
                resumoPorClasse[ativoInfo.classe_b3].count++;
                resumoPorClasse[ativoInfo.classe_b3].total += posicao.custoTotal;
            }
        });
        
        // Define a cor do badge de Lucro/Prejuízo
        const lucroPrejuizoBadgeColor = lucroPrejuizo >= 0 ? 'bg-success' : 'bg-danger';

        // Cria o HTML para exibir os indicadores
        const indicadoresHTML = `
            <ul class="list-group list-group-flush">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>Valor Total Investido</span>
                    <span class="badge bg-secondary rounded-pill fs-6">${formatCurrency(valorTotalInvestido)}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <strong>Valor de Mercado</strong>
                    <span class="badge bg-primary rounded-pill fs-6">${formatCurrency(valorDeMercadoTotal)}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <strong>Valorização da Carteira</strong>
                    <span class="badge ${valorizacaoBadgeColor} rounded-pill fs-6">
                        ${formatCurrency(diferencaValor)}
                        <small class="ms-2"><i class="bi ${valorizacaoIcon}"></i> ${variacaoPercentual.toFixed(2)}%</small>
                    </span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <strong>Lucro / Prejuízo Realizado</strong>
                    <span class="badge ${lucroPrejuizoBadgeColor} rounded-pill fs-6">
                        ${formatCurrency(lucroPrejuizo)}
                    </span>
                </li>
            </ul>    
        `;

        resumoIndicadoresContent.innerHTML = indicadoresHTML;

        // Chama a função para renderizar o gráfico com os dados calculados
        renderDistributionChart(resumoPorClasse);
    };

    // Inscreve a função de renderização no store.
    // Ela será chamada automaticamente sempre que o estado (ativos ou carteira) mudar.
    store.subscribe(renderResumo);
};