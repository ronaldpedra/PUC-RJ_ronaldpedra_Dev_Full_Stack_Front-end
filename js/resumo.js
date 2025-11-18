export const initResumo = () => {
    // Seleciona o contêiner onde o resumo será exibido
    const resumoContent = document.getElementById('resumo-content');

    /**
     * Calcula e renderiza os principais indicadores do resumo da carteira.
     */
    const renderResumo = () => {
        // Busca os dados da carteira através da função global
        const carteira = window.getCarteira ? window.getCarteira() : [];

        // Limpa o conteúdo atual
        resumoContent.innerHTML = '';

        if (carteira.length === 0) {
            resumoContent.innerHTML = '<p class="text-center text-muted">A carteira está vazia.</p>';
            return;
        }

        // 1. Calcula o Valor Total Investido
        const valorTotalInvestido = carteira.reduce((total, posicao) => total + posicao.custoTotal, 0);

        // Cria o HTML para exibir os indicadores
        const resumoHTML = `
            <ul class="list-group list-group-flush">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <strong>Valor Total Investido</strong>
                    <span class="badge bg-success rounded-pill fs-6">R$ ${valorTotalInvestido.toFixed(2)}</span>
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