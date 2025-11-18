// Seleciona o contêiner onde o conteúdo da carteira será exibido
const carteiraContent = document.querySelector('#carteira-content');

/**
 * Renderiza a seção da carteira.
 * Inicialmente, exibe uma mensagem se nenhum ativo for encontrado.
 */
const renderCarteira = () => {
    // Limpa o conteúdo atual e define uma mensagem padrão para carteira vazia
    carteiraContent.innerHTML = '<p class="text-center">Nenhum ativo na carteira.</p>';
};

export const initCarteira = () => {
    // Renderiza o estado inicial da carteira ao carregar a página
    renderCarteira();
};