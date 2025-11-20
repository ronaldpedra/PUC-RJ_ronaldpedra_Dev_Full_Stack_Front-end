// Importa a função de inicialização do módulo de ativos
import { initAtivos } from './ativos.js';
// Importa a função de inicialização do módulo da carteira
import { initCarteira } from './carteira.js';
// Importa a função de inicialização do módulo de resumo
import { initResumo } from './resumo.js';
// Importa a função de inicialização do módulo de configurações
import { initConfiguracoes } from './configuracoes.js';

// Aguarda o DOM carregar para garantir que todos os elementos HTML estejam disponíveis
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o módulo de ativos
    initAtivos();
    // Inicializa o módulo de configurações
    initConfiguracoes();
    // Inicializa o módulo da carteira
    initCarteira();
    // Inicializa o módulo de resumo
    initResumo();
});