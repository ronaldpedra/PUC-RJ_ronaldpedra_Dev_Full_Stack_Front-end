// Importa a função de inicialização do módulo de ativos
import { initAtivos } from './ativos.js';
// Importa a função de inicialização do módulo da carteira
import { initCarteira } from './carteira.js';
// Importa a função de inicialização do módulo de resumo
import { initResumo } from './resumo.js';
// Importa a função de inicialização do módulo de configurações
import { initConfiguracoes } from './configuracoes.js';

// Aguarda o DOM carregar para garantir que todos os elementos HTML estejam disponíveis
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa o módulo de configurações
    initConfiguracoes();

    // Inicia o carregamento dos dados da carteira e dos ativos em paralelo
    const carteiraPromise = initCarteira();
    const ativosPromise = initAtivos();

    // Aguarda que AMBOS os carregamentos terminem antes de prosseguir
    await Promise.all([carteiraPromise, ativosPromise]);

    // Agora que temos certeza que a carteira e os ativos foram carregados,
    // podemos inicializar o módulo de resumo, que depende desses dados.
    initResumo();
});