export const initResumo = () => {
    // Seleciona o contêiner onde o resumo será exibido
    const resumoContent = document.getElementById('resumo-content');

    /**
     * Calcula e renderiza os principais indicadores do resumo da carteira.
     */
    const renderResumo = () => {
        // Busca os dados da carteira através da função global
        const carteira = window.getCarteira ? window.getCarteira() : [];
        // Busca os dados dos ativos cadastrados para obter a classe
        const ativosCadastrados = window.getAtivos ? window.getAtivos() : [];
        // Busca o lucro/prejuízo realizado
        const lucroPrejuizo = window.getLucroPrejuizo ? window.getLucroPrejuizo() : 0;

        // Limpa o conteúdo atual
        resumoContent.innerHTML = '';

        if (carteira.length === 0) {
            resumoContent.innerHTML = '<p class="text-center text-muted">A carteira está vazia.</p>';
            return;
        }

        // 1. Calcula o Valor Total Investido
        const valorTotalInvestido = carteira.reduce((total, posicao) => total + posicao.custoTotal, 0);

        // 2. Prepara a estrutura para agrupar por classe
        const resumoPorClasse = {
            'Ação': { count: 0, total: 0 },
            'FII': { count: 0, total: 0 },
            'ETF': { count: 0, total: 0 },
            'BDR': { count: 0, total: 0 }
        };

        // 3. Processa cada posição da carteira para agrupar por classe
        carteira.forEach(posicao => {
            const ativoInfo = ativosCadastrados.find(a => a.ticker === posicao.ticker);
            if (ativoInfo && resumoPorClasse.hasOwnProperty(ativoInfo.classe)) {
                resumoPorClasse[ativoInfo.classe].count++;
                resumoPorClasse[ativoInfo.classe].total += posicao.custoTotal;
            }
        });

        // Define a cor do badge de Lucro/Prejuízo
        const lucroPrejuizoBadgeColor = lucroPrejuizo >= 0 ? 'bg-success' : 'bg-danger';

        // Cria o HTML para exibir os indicadores
        let resumoHTML = `
            <ul class="list-group list-group-flush">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <strong>Valor Total Investido</strong>
                    <span class="badge bg-success rounded-pill fs-6">R$ ${valorTotalInvestido.toFixed(2)}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <strong>Lucro / Prejuízo Realizado</strong>
                    <span class="badge ${lucroPrejuizoBadgeColor} rounded-pill fs-6">
                        R$ ${lucroPrejuizo.toFixed(2)}
                    </span>
                </li>
                <li class="list-group-item">
                    <strong class="d-block mb-2">Distribuição por Classe:</strong>
                    <ul class="list-group">
        `;

        // 4. Adiciona a lista de classes ao HTML
        Object.keys(resumoPorClasse).forEach(classe => {
            const { count, total } = resumoPorClasse[classe];
            if (count > 0) { // Só exibe a classe se houver ativos dela na carteira
                resumoHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center ps-0 border-0">
                        ${classe}
                        <span class="badge bg-secondary rounded-pill">
                            ${count} ativo(s) / R$ ${total.toFixed(2)}
                        </span>
                    </li>
                `;
            }
        });

        resumoHTML += `
                    </ul>
                </li>
            </ul>    
        `;

        resumoContent.innerHTML = resumoHTML;
    };

    // Registra a função renderResumo para ser chamada sempre que a carteira for atualizada
    window.addPortfolioUpdateListener(renderResumo);
    // Renderiza o estado inicial do resumo
    renderResumo();
};