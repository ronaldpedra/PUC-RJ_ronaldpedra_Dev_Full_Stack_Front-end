// js/apiService.js

/**
 * Módulo centralizado para todas as comunicações com APIs externas e com o nosso back-end.
 */

const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;
const BRAPI_TOKEN = window.APP_CONFIG.BRAPI_TOKEN;

// --- Funções para a API do DashInvest (Back-end) ---

/**
 * Busca a lista inicial de ativos cadastrados no nosso back-end.
 * @returns {Promise<Array>} Uma promise que resolve com a lista de ativos.
 */
export async function fetchInitialAtivos() {
    const response = await fetch(`${API_BASE_URL}/ativos`);
    if (!response.ok) {
        throw new Error(`Erro na rede ao buscar ativos: ${response.statusText}`);
    }
    const data = await response.json();
    return data.ativos || [];
}

/**
 * Envia um novo ativo para ser cadastrado no back-end.
 * @param {FormData} formData Os dados do novo ativo.
 * @returns {Promise<object>} Uma promise que resolve com o ativo criado.
 */
export async function postAtivo(formData) {
    const response = await fetch(`${API_BASE_URL}/ativos`, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'O servidor respondeu com um erro.' }));
        throw new Error(errorData.message);
    }
    return response.json();
}

/**
 * Envia uma atualização para um ativo existente no back-end.
 * @param {string} ticker O ticker do ativo a ser atualizado.
 * @param {FormData} formData Os novos dados do ativo.
 * @returns {Promise<object>} Uma promise que resolve com o ativo atualizado.
 */
export async function patchAtivo(ticker, formData) {
    const response = await fetch(`${API_BASE_URL}/ativos/?ticker=${ticker}`, {
        method: 'PATCH',
        body: formData
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Falha ao atualizar o ativo no servidor.' }));
        throw new Error(errorData.message);
    }
    return response.json();
}

/**
 * Envia uma requisição para excluir um ativo no back-end.
 * @param {string} ticker O ticker do ativo a ser excluído.
 * @returns {Promise<object>} Uma promise que resolve com a resposta da exclusão.
 */
export async function deleteAtivo(ticker) {
    const response = await fetch(`${API_BASE_URL}/ativos/?ticker=${ticker}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        throw new Error('Falha ao excluir o ativo no servidor.');
    }
    return response.json();
}

/**
 * Busca o histórico completo da carteira do back-end.
 * @returns {Promise<Array>} Uma promise que resolve com o histórico da carteira.
 */
export async function fetchHistoricoCarteira() {
    const response = await fetch(`${API_BASE_URL}/movimentacoes/carteira`);
    if (!response.ok) {
        throw new Error(`Erro na rede ao buscar carteira: ${response.statusText}`);
    }
    const data = await response.json();
    return data.carteira || [];
}

/**
 * Envia uma nova movimentação (compra/venda) para o back-end.
 * @param {FormData} formData Os dados da movimentação.
 * @returns {Promise<object>} Uma promise que resolve com a resposta do servidor.
 */
export async function postMovimentacao(formData) {
    const response = await fetch(`${API_BASE_URL}/movimentacoes`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) {
        throw new Error('Falha ao registrar a movimentação no servidor.');
    }
    return response.json();
}

// --- Funções para a API da Brapi ---

/**
 * Busca os dados de um ativo específico (cotação, nome, etc.) na API da Brapi.
 * @param {string} ticker O código do ativo a ser buscado.
 * @returns {Promise<object>} Uma promise que resolve com os dados detalhados do ativo.
 */
export async function fetchBrapiData(ticker) {
    const url = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha na requisição para a API Brapi: ${response.statusText}`);
    const data = await response.json();
    const result = data.results && data.results[0];
    if (!result || data.error) throw new Error(data.error || `Ticker "${ticker}" não encontrado na Brapi.`);
    return result;
}