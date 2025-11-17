// Importa a função de inicialização do módulo de ativos
import { initAtivos } from './ativos.js';

// Aguarda o DOM carregar para garantir que todos os elementos HTML estejam disponíveis
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o módulo de ativos
    initAtivos();
});