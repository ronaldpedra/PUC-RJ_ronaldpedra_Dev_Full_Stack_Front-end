export function initConfiguracoes() {
    const integrityToggle = document.getElementById('integrity-check-toggle');

    // Define o estado inicial do switch com base na configuração global
    integrityToggle.checked = window.APP_CONFIG.MANTER_INTEGRIDADE_DADOS;

    // Adiciona um listener para atualizar a configuração global quando o switch for alterado
    integrityToggle.addEventListener('change', () => {
        window.APP_CONFIG.MANTER_INTEGRIDADE_DADOS = integrityToggle.checked;
        console.log(
            'Modo de integridade de dados:',
            window.APP_CONFIG.MANTER_INTEGRIDADE_DADOS ? 'ATIVADO' : 'DESATIVADO'
        );
    });
}
