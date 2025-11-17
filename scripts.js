// Aguarda o conteúdo do DOM ser totalmente carregado antes de executar o script
document.addEventListener('DOMContentLoaded', function () {

    // Dados de exemplo para os ativos. Em um projeto real, isso viria de uma API.
    const ativos = [
        { ticker: 'PETR4', nome: 'Petrobras', valor: 38.50 },
        { ticker: 'VALE3', nome: 'Vale', valor: 62.75 },
        { ticker: 'ITUB4', nome: 'Itaú Unibanco', valor: 32.10 },
        { ticker: 'MGLU3', nome: 'Magazine Luiza', valor: 2.50 },
        { ticker: 'WEGE3', nome: 'WEG', valor: 35.80 }
    ];

    // Seleciona o contêiner onde a lista de ativos será inserida
    const ativosContent = document.getElementById('ativos-content');

    // Verifica se o contêiner de ativos existe na página
    if (ativosContent) {
        // Limpa qualquer conteúdo inicial (como o parágrafo de placeholder)
        ativosContent.innerHTML = '';

        // Cria o elemento da lista (<ul>) com as classes do Bootstrap
        const listGroup = document.createElement('ul');
        listGroup.className = 'list-group list-group-flush';

        // Itera sobre os dados dos ativos para criar cada item da lista (<li>)
        ativos.forEach(ativo => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';

            // Define o conteúdo HTML de cada item da lista
            listItem.innerHTML = `
                <span>${ativo.ticker} - ${ativo.nome}</span>
                <span class="badge bg-primary rounded-pill">R$ ${ativo.valor.toFixed(2)}</span>
            `;
            listGroup.appendChild(listItem);
        });

        // Adiciona a lista completa ao contêiner no DOM
        ativosContent.appendChild(listGroup);
    }
});