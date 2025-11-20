// js/config.js

// Este arquivo centraliza as configurações do ambiente para o front-end.
// Ao anexar o objeto ao 'window', garantimos que ele esteja acessível globalmente
// em outros scripts, desde que este arquivo seja carregado primeiro.

window.APP_CONFIG = {
    API_BASE_URL: 'http://127.0.0.1:5000',
    BRAPI_TOKEN: 'gfUi1V9jZ9MmxniKbqvscm',
    MANTER_INTEGRIDADE_DADOS: true // true = valida na API externa; false = não valida.
};