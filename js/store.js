// js/store.js

/**
 * Módulo de gerenciamento de estado centralizado para a aplicação.
 * Funciona como uma "fonte única da verdade" para os dados.
 */

// O estado inicial da nossa aplicação.
const state = {
    ativos: [], // Lista de todos os ativos cadastrados
    historicoCarteira: [], // Histórico completo de movimentações/posições
};

// Lista de funções (listeners) que serão chamadas sempre que o estado mudar.
const listeners = [];

/**
 * Permite que outros módulos se inscrevam para receber notificações de mudança de estado.
 * @param {Function} listener A função a ser chamada quando o estado mudar.
 */
export function subscribe(listener) {
    listeners.push(listener);
}

/**
 * Notifica todos os inscritos que o estado foi alterado.
 */
function notify() {
    for (const listener of listeners) {
        listener();
    }
}

/**
 * Atualiza uma parte do estado e notifica os inscritos.
 * @param {object} newState O novo estado a ser mesclado com o estado atual.
 */
export function setState(newState) {
    Object.assign(state, newState);
    notify();
}

// --- Getters: Funções para acessar o estado de forma segura ---

/**
 * Retorna uma cópia da lista de ativos.
 * @returns {Array}
 */
export function getAtivos() {
    return [...state.ativos];
}

/**
 * Retorna uma cópia do histórico completo da carteira.
 * @returns {Array}
 */
export function getHistoricoCarteira() {
    return [...state.historicoCarteira];
}