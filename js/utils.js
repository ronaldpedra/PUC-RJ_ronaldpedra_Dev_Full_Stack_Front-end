// js/utils.js

/**
 * Formata um número para o padrão monetário brasileiro (BRL).
 * Ex: 12345.67 se torna "R$ 12.345,67"
 * @param {number} value O número a ser formatado.
 * @returns {string} A string formatada como moeda.
 */
export function formatCurrency(value) {
    if (typeof value !== 'number') return 'R$ 0,00';

    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/**
 * Exibe um alerta dinâmico do Bootstrap no topo da página.
 * @param {string} message A mensagem a ser exibida.
 * @param {string} type O tipo de alerta do Bootstrap (e.g., 'success', 'danger', 'warning').
 */
export function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        console.error('Elemento #alert-container não encontrado no DOM. Usando alert nativo como fallback.');
        alert(message);
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    alertContainer.append(wrapper);

    // Remove o alerta automaticamente após 5 segundos
    setTimeout(() => wrapper.remove(), 5000);
}