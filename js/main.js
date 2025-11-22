// Importa a função de inicialização do módulo de ativos
import { initAtivos } from './ativos.js';
// Importa a função de inicialização do módulo da carteira
import { initCarteira } from './carteira.js';
// Importa a função de inicialização do módulo de resumo
import { initResumo } from './resumo.js';
// Importa a função de inicialização do módulo de configurações
import { initConfiguracoes } from './configuracoes.js';
// Importa as funções de utilidade (neste caso, apenas para garantir o carregamento do módulo)
import './utils.js';

// Aguarda o DOM carregar para garantir que todos os elementos HTML estejam disponíveis
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa o módulo de configurações
    initConfiguracoes();
    // Inicializa o módulo de resumo, que se inscreve no store para futuras atualizações.
    initResumo();

    // Inicia o carregamento dos dados da carteira e dos ativos em paralelo
    const carteiraPromise = initCarteira();
    const ativosPromise = initAtivos();


    await Promise.all([carteiraPromise, ativosPromise]);
});