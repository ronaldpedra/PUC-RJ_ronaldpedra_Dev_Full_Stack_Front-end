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