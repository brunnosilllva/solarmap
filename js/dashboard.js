// ================================
// DASHBOARD PRINCIPAL - SOLARMAP
// VERSÃO INTEGRADA COM MERGE CORRIGIDO
// ================================
console.log('🚀 Dashboard SolarMap - VERSÃO INTEGRADA COM MERGE CORRIGIDO');

// ================================
// VARIÁVEIS GLOBAIS
// ================================
let dadosCompletos = [];
let dadosExcel = [];
let dadosGeoJSON = [];
let imovelSelecionado = null;
let estatisticas = {};
let estatisticasPorBairro = {};

// Filtros ativos
let filtrosAtivos = {
    bairros: [],
    info: 'capacidade_por_m2',
    minValue: null,
    maxValue: null
};

// ================================
// FUNÇÕES DE FORMATAÇÃO
// ================================
function formatNumber(numero, decimais = 2) {
    if (numero === null || numero === undefined || isNaN(numero)) {
        return decimais > 0 ? '0,00' : '0';
    }
    
    const valor = parseFloat(numero);
    if (isNaN(valor)) {
        return decimais > 0 ? '0,00' : '0';
    }
    
    return valor.toLocaleString('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais
    });
}

function showMessage(message) {
    console.log(message);
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${message.includes('❌') ? '#e74c3c' : '#27ae60'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 400px;
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

// ================================
// INTEGRAÇÃO COM SISTEMA DE MERGE
// ================================
async function carregarDadosComMerge() {
    console.log('🔗 === CARREGANDO DADOS COM MERGE INTEGRADO ===');
    
    try {
        // Verificar se o sistema de merge está disponível
        if (typeof window.inicializarSistemaMerge !== 'function') {
            throw new Error('Sistema de merge não carregado. Certifique-se de que o merge_dados_corrigido.js foi carregado primeiro.');
        }
        
        // Inicializar sistema de merge
        console.log('🚀 Iniciando sistema de merge...');
        await window.inicializarSistemaMerge();
        
        // Verificar se dados foram processados
        if (!window.dadosCompletos || window.dadosCompletos.length === 0) {
            throw new Error('Merge não produziu dados válidos');
        }
        
        // Atualizar variáveis globais do dashboard
        dadosCompletos = window.dadosCompletos;
        dadosGeoJSON = window.dadosGeoJSON || [];
        dadosExcel = window.dadosExcel || [];
        
        console.log(`✅ Dados carregados via merge: ${dadosCompletos.length} itens`);
        
        // Calcular estatísticas
        calcularEstatisticas();
        calcularEstatisticasPorBairro();
        updateSummaryCards();
        
        console.log('✅ Dados carregados e processados com sucesso!');
        return dadosCompletos;
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados com merge:', error);
        throw error;
    }
}

// ================================
// CÁLCULOS DE ESTATÍSTICAS
// ================================
function calcularEstatisticas() {
    if (!dadosCompletos || dadosCompletos.length === 0) {
        estatisticas = { total_imoveis: 0, producao_total: 0, media_producao: 0 };
        return;
    }
    
    console.log(`📊 Calculando estatísticas para ${dadosCompletos.length} itens`);
    
    const totalImoveis = dadosCompletos.length;
    
    // Usar capacidade_por_m2 conforme especificação
    const producaoTotal = dadosCompletos.reduce((sum, item) => {
        if (item && item.properties && typeof item.properties.capacidade_por_m2 === 'number') {
            return sum + item.properties.capacidade_por_m2;
        }
        return sum;
    }, 0);
    
    const mediaProducao = totalImoveis > 0 ? producaoTotal / totalImoveis : 0;
    
    estatisticas = {
        total_imoveis: totalImoveis,
        producao_total: producaoTotal,
        media_producao: mediaProducao
    };
    
    window.estatisticas = estatisticas;
    console.log('📊 Estatísticas globais calculadas:', estatisticas);
}

function calcularEstatisticasPorBairro() {
    if (!dadosCompletos || dadosCompletos.length === 0) {
        estatisticasPorBairro = {};
        return;
    }
    
    const dadosPorBairro = {};
    
    dadosCompletos.forEach(item => {
        if (item && item.properties) {
            const bairro = item.properties.bairro || 'Não informado';
            if (!dadosPorBairro[bairro]) {
                dadosPorBairro[bairro] = [];
            }
            dadosPorBairro[bairro].push(item);
        }
    });
    
    estatisticasPorBairro = {};
    
    Object.entries(dadosPorBairro).forEach(([bairro, imoveis]) => {
        const totalImoveis = imoveis.length;
        
        const somaProducaoTelhado = imoveis.reduce((sum, item) => {
            if (item && item.properties && typeof item.properties.producao_telhado === 'number') {
                return sum + item.properties.producao_telhado;
            }
            return sum;
        }, 0);
        
        const somaRadiacaoMax = imoveis.reduce((sum, item) => {
            if (item && item.properties && typeof item.properties.radiacao_max === 'number') {
                return sum + item.properties.radiacao_max;
            }
            return sum;
        }, 0);
        
        const mediaProducaoTelhado = totalImoveis > 0 ? somaProducaoTelhado / totalImoveis : 0;
        const mediaRadiacaoMax = totalImoveis > 0 ? somaRadiacaoMax / totalImoveis : 0;
        
        // Calcular médias mensais por bairro
        const mediaProducaoMensal = new Array(12).fill(0);
        const mediaRadiacaoMensal = new Array(12).fill(0);
        
        for (let mes = 0; mes < 12; mes++) {
            const somaProducaoMes = imoveis.reduce((sum, item) => {
                if (item.properties.dados_mensais_producao && item.properties.dados_mensais_producao[mes]) {
                    return sum + item.properties.dados_mensais_producao[mes];
                }
                return sum;
            }, 0);
            
            const somaRadiacaoMes = imoveis.reduce((sum, item) => {
                if (item.properties.dados_mensais_radiacao && item.properties.dados_mensais_radiacao[mes]) {
                    return sum + item.properties.dados_mensais_radiacao[mes];
                }
                return sum;
            }, 0);
            
            mediaProducaoMensal[mes] = totalImoveis > 0 ? somaProducaoMes / totalImoveis : 0;
            mediaRadiacaoMensal[mes] = totalImoveis > 0 ? somaRadiacaoMes / totalImoveis : 0;
        }
        
        estatisticasPorBairro[bairro] = {
            total_imoveis: totalImoveis,
            media_producao_mensal: mediaProducaoMensal,
            media_radiacao_mensal: mediaRadiacaoMensal
        };
    });
    
    window.estatisticasPorBairro = estatisticasPorBairro;
    console.log('📊 Estatísticas por bairro calculadas:', Object.keys(estatisticasPorBairro).length, 'bairros');
}

// ================================
// ATUALIZAÇÃO DOS CARDS
// ================================
function updateSummaryCards() {
    const dados = filtrarDados();
    const totalEl = document.getElementById('total-imoveis-display');
    const producaoEl = document.getElementById('producao-total-display');
    const mediaEl = document.getElementById('media-imovel-display');
    
    if (totalEl) {
        totalEl.textContent = dados.length.toLocaleString('pt-BR');
    }
    if (producaoEl) {
        const total = dados.reduce((sum, item) => {
            return sum + (item.properties?.capacidade_por_m2 || 0);
        }, 0);
        producaoEl.textContent = formatNumber(total, 2);
    }
    if (mediaEl) {
        const total = dados.reduce((sum, item) => {
            return sum + (item.properties?.capacidade_por_m2 || 0);
        }, 0);
        const media = dados.length > 0 ? total / dados.length : 0;
        mediaEl.textContent = formatNumber(media, 2);
    }
}

// ================================
// FILTROS
// ================================
function filtrarDados() {
    return dadosCompletos.filter(item => {
        if (!item || !item.properties) return false;
        
        const props = item.properties;
        if (filtrosAtivos.bairros.length > 0) {
            if (!filtrosAtivos.bairros.includes(props.bairro)) {
                return false;
            }
        }
        const valor = props[filtrosAtivos.info] || 0;
        if (filtrosAtivos.minValue !== null && valor < filtrosAtivos.minValue) {
            return false;
        }
        if (filtrosAtivos.maxValue !== null && valor > filtrosAtivos.maxValue) {
            return false;
        }
        return true;
    });
}

// ================================
// SELEÇÃO DE IMÓVEL
// ================================
function selecionarImovel(imovelId) {
    const imovel = dadosCompletos.find(item => item.id === imovelId);
    if (imovel) {
        imovelSelecionado = imovel;
        updateInfoCards(imovel);
        updateRelatorio(imovel);
        updateCharts(imovel);
        console.log(`✅ Imóvel ${imovelId} selecionado do bairro: ${imovel.properties.bairro}`);
        console.log('📊 Dados vinculados:', imovel.isLinked ? 'SIM' : 'NÃO');
        if (window.centerOnImovel) {
            window.centerOnImovel(imovelId);
        }
    }
}

// ================================
// ATUALIZAÇÃO DOS CARDS DE INFORMAÇÃO
// ================================
function updateInfoCards(imovel = null) {
    const elementos = {
        'area-edificacao-display': imovel ? (imovel.properties.area_edificacao || 0) : 0,
        'radiacao-max-display': imovel ? (imovel.properties.radiacao_max || 0) : 0,
        'capacidade-por-m2-display': imovel ? (imovel.properties.capacidade_por_m2 || 0) : 0,
        'producao-telhado-display': imovel ? (imovel.properties.producao_telhado || 0) : 0,
        'capacidade-placas-dia-display': imovel ? (imovel.properties.capacidade_placas_dia || 0) : 0,
        'capacidade-placas-mes-display': imovel ? (imovel.properties.capacidade_placas_mes || 0) : 0,
        'quantidade-placas-display': imovel ? (imovel.properties.quantidade_placas || 0) : 0,
        'potencial-medio-dia-display': imovel ? (imovel.properties.potencial_medio_dia || 0) : 0,
        'renda-total-display': imovel ? (imovel.properties.renda_total || 0) : 0,
        'renda-per-capita-display': imovel ? (imovel.properties.renda_per_capita || 0) : 0,
        'renda-domiciliar-per-capita-display': imovel ? (imovel.properties.renda_domiciliar_per_capita || 0) : 0
    };
    
    Object.entries(elementos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (id.includes('quantidade')) {
                elemento.textContent = formatNumber(valor, 0);
            } else {
                elemento.textContent = formatNumber(valor, 2);
            }
        }
    });
    
    if (imovel && imovel.isLinked) {
        console.log(`✅ Cards atualizados para imóvel ${imovel.id} do bairro ${imovel.properties.bairro}`);
    }
}

// ================================
// ATUALIZAÇÃO DO RELATÓRIO
// ================================
function updateRelatorio(imovel = null) {
    const tituloEl = document.getElementById('relatorio-titulo');
    const conteudoEl = document.getElementById('relatorio-conteudo');
    if (!tituloEl || !conteudoEl) return;
    
    if (imovel) {
        const props = imovel.properties;
        tituloEl.textContent = `📊 Relatório - Imóvel ${imovel.id}`;
        
        const textoRelatorio = `O imóvel selecionado no Bairro ${props.bairro}, localizado nas coordenadas (${imovel.centroid[0].toFixed(6)}, ${imovel.centroid[1].toFixed(6)}), possui ${formatNumber(props.area_edificacao, 2)} m², com Quantidade de Radiação Máxima Solar nos 12 meses do ano de ${formatNumber(props.radiacao_max, 2)} kW/m², apresentando uma Capacidade de Produção de energia de ${formatNumber(props.capacidade_por_m2, 2)} kW por m², com produção diária de ${formatNumber(props.capacidade_placas_dia, 2)} kWh e produção média mensal de ${formatNumber(props.capacidade_placas_mes, 2)} kWh. Para essa produção estima-se a necessidade de ${formatNumber(props.quantidade_placas, 0)} placas fotovoltaicas. O imóvel apresenta um potencial médio de geração de ${formatNumber(props.potencial_medio_dia, 2)} kW.dia/m² e está localizado em uma região com renda total de R$ ${formatNumber(props.renda_total, 2)}, renda per capita de R$ ${formatNumber(props.renda_per_capita, 2)} e renda domiciliar per capita de R$ ${formatNumber(props.renda_domiciliar_per_capita, 2)}.`;
        
        conteudoEl.innerHTML = `<p style="text-align: justify; line-height: 1.6;">${textoRelatorio}</p>`;
    } else {
        tituloEl.textContent = '📊 Relatório do Imóvel';
        conteudoEl.innerHTML = `
            <p>Selecione um imóvel no mapa para ver o relatório detalhado.</p>
            <p><strong>Sistema com Merge Integrado:</strong></p>
            <ul>
                <li>✅ Merge automático GeoJSON + Excel</li>
                <li>✅ Vinculação por OBJECTID</li>
                <li>✅ Dados mensais implementados</li>
                <li>✅ Conversão de coordenadas SIRGAS 2000</li>
            </ul>
        `;
    }
}

// ================================
// FUNÇÕES DE INICIALIZAÇÃO DOS MÓDULOS
// ================================
function initializeCharts() {
    console.log('📊 Charts inicializados');
    if (window.initializeCharts && typeof window.initializeCharts === 'function') {
        try {
            window.initializeCharts();
        } catch (error) {
            console.error('❌ Erro ao inicializar charts:', error);
        }
    }
}

function initializeFilters() {
    console.log('🔍 Filtros inicializados');
    if (window.initializeFilters && typeof window.initializeFilters === 'function') {
        try {
            window.initializeFilters();
        } catch (error) {
            console.error('❌ Erro ao inicializar filtros:', error);
        }
    }
}

function initializeEvents() {
    console.log('🎯 Eventos inicializados');
    const btnPdf = document.getElementById('btn-gerar-pdf');
    if (btnPdf) {
        btnPdf.addEventListener('click', function() {
            const instructions = document.getElementById('pdf-instructions');
            if (instructions) {
                instructions.style.display = instructions.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            diagnosticDataDetailed();
        }
        if (e.key === 'Escape') {
            if (window.clearSelection) {
                window.clearSelection();
            }
            imovelSelecionado = null;
            updateInfoCards();
            updateRelatorio();
            updateCharts();
        }
    });
}

function updateCharts(imovel = null) {
    if (window.updateCharts && typeof window.updateCharts === 'function') {
        try {
            window.updateCharts(imovel);
        } catch (error) {
            console.error('❌ Erro ao atualizar charts:', error);
        }
    }
}

// ================================
// DIAGNÓSTICO
// ================================
function diagnosticDataDetailed() {
    console.log('🔍 === DIAGNÓSTICO DETALHADO INTEGRADO ===');
    
    // Diagnóstico do merge
    if (window.diagnosticoDetalhado) {
        console.log('📊 === DIAGNÓSTICO DO SISTEMA DE MERGE ===');
        window.diagnosticoDetalhado();
    }
    
    // Diagnóstico dos dados carregados
    if (dadosCompletos && dadosCompletos.length > 0) {
        console.log('📊 === DIAGNÓSTICO DOS DADOS CARREGADOS ===');
        console.log(`📍 Total de dados: ${dadosCompletos.length}`);
        
        const comDadosExcel = dadosCompletos.filter(item => item.isLinked);
        const comValoresReais = dadosCompletos.filter(item => 
            item.properties?.area_edificacao > 0 || 
            item.properties?.producao_telhado > 0 || 
            item.properties?.capacidade_por_m2 > 0
        );
        
        console.log(`✅ Com dados Excel: ${comDadosExcel.length} (${((comDadosExcel.length/dadosCompletos.length)*100).toFixed(1)}%)`);
        console.log(`📊 Com valores reais: ${comValoresReais.length} (${((comValoresReais.length/dadosCompletos.length)*100).toFixed(1)}%)`);
        
        const bairros = [...new Set(dadosCompletos.map(item => item.properties?.bairro).filter(b => b && b !== 'Não informado'))];
        console.log(`🏘️ Bairros únicos: ${bairros.length}`);
        console.log(`🏘️ Lista de bairros:`, bairros.slice(0, 10));
        
        // Exemplo de item com dados
        const exemploComDados = dadosCompletos.find(item => item.isLinked && item.properties?.area_edificacao > 0);
        if (exemploComDados) {
            console.log('📋 Exemplo de item com dados completos:');
            console.log(`   ID: ${exemploComDados.id}`);
            console.log(`   Bairro: ${exemploComDados.properties.bairro}`);
            console.log(`   Área: ${exemploComDados.properties.area_edificacao} m²`);
            console.log(`   Produção: ${exemploComDados.properties.producao_telhado} kW`);
            console.log(`   Radiação: ${exemploComDados.properties.radiacao_max} kW/m²`);
            console.log(`   Placas: ${exemploComDados.properties.quantidade_placas}`);
            console.log(`   Centroide: [${exemploComDados.centroid[0].toFixed(6)}, ${exemploComDados.centroid[1].toFixed(6)}]`);
        }
    } else {
        console.error('❌ Nenhum dado carregado');
    }
    
    // Diagnóstico das estatísticas
    console.log('📊 === ESTATÍSTICAS ===');
    console.log('Globais:', estatisticas);
    console.log('Por bairro:', Object.keys(estatisticasPorBairro).length, 'bairros');
    
    // Diagnóstico dos filtros
    console.log('🔍 === FILTROS ATIVOS ===');
    console.log(filtrosAtivos);
    
    const dadosFiltrados = filtrarDados();
    console.log(`📊 Dados após filtros: ${dadosFiltrados.length}/${dadosCompletos.length}`);
}

// ================================
// INICIALIZAÇÃO PRINCIPAL INTEGRADA
// ================================
async function initializeDashboard() {
    console.log('📊 === SOLARMAP - VERSÃO INTEGRADA COM MERGE ===');
    
    try {
        // Verificar se está rodando em Live Server
        if (window.location.protocol === 'file:') {
            console.error('❌ Use Live Server!');
            showMessage('❌ Use Live Server para acessar os arquivos!');
            return;
        }
        
        console.log('✅ Live Server detectado');
        
        // Verificar se XLSX está disponível
        if (typeof XLSX === 'undefined') {
            throw new Error('Biblioteca XLSX não carregada');
        }
        console.log('✅ XLSX disponível');
        
        // Verificar se sistema de merge está disponível
        if (typeof window.inicializarSistemaMerge !== 'function') {
            throw new Error('Sistema de merge não carregado. Verifique se merge_dados_corrigido.js foi carregado.');
        }
        console.log('✅ Sistema de merge disponível');
        
        // 1. Carregar dados com merge integrado
        console.log('🔗 1/5 - Executando merge dos dados...');
        await carregarDadosComMerge();
        
        // 2. Criar mapa
        console.log('🗺️ 2/5 - Criando mapa...');
        await initMapAndWait();
        
        // 3. Adicionar polígonos
        console.log('📍 3/5 - Adicionando polígonos...');
        await addPolygonsAndWait();
        
        // 4. Inicializar módulos
        console.log('📊 4/5 - Inicializando módulos...');
        initializeCharts();
        initializeFilters();
        initializeEvents();
        
        // 5. Finalizar
        console.log('✅ 5/5 - Finalizando...');
        
        // Atualizar filtros após carregamento completo
        if (window.populateBairroSelect) {
            window.populateBairroSelect();
        }
        
        console.log('✅ === DASHBOARD INTEGRADO INICIALIZADO COM SUCESSO! ===');
        showMessage('✅ SolarMap carregado com merge integrado!');
        
        // Estatísticas finais
        console.log('📊 === ESTATÍSTICAS FINAIS ===');
        console.log(`📍 Dados carregados: ${dadosCompletos.length} itens`);
        console.log(`🗺️ Polígonos no mapa: ${window.layerGroup?.getLayers().length || 0}`);
        console.log(`🏘️ Bairros disponíveis: ${Object.keys(estatisticasPorBairro).length}`);
        
        const dadosVinculados = dadosCompletos.filter(item => item.isLinked);
        console.log(`📋 Taxa de vinculação: ${dadosVinculados.length}/${dadosCompletos.length} (${((dadosVinculados.length/dadosCompletos.length)*100).toFixed(1)}%)`);
        
        // Verificar qualidade dos dados
        const dadosComValores = dadosCompletos.filter(item => 
            item.properties.area_edificacao > 0 || 
            item.properties.producao_telhado > 0 || 
            item.properties.capacidade_por_m2 > 0
        );
        console.log(`📈 Dados com valores válidos: ${dadosComValores.length} (${((dadosComValores.length/dadosCompletos.length)*100).toFixed(1)}%)`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro na inicialização do dashboard:', error);
        showMessage(`❌ Erro: ${error.message}`);
        
        // Mostrar instruções de debug
        console.log('');
        console.log('🔧 === INSTRUÇÕES DE DEBUG ===');
        console.log('1. Verifique se todos os arquivos JS foram carregados');
        console.log('2. Certifique-se de que os arquivos estão na pasta "data/"');
        console.log('3. Execute diagnosticDataDetailed() para mais detalhes');
        console.log('4. Verifique o console para erros específicos');
        
        throw error;
    }
}

// ================================
// FUNÇÕES AUXILIARES PARA INICIALIZAÇÃO
// ================================
async function initMapAndWait() {
    return new Promise((resolve, reject) => {
        try {
            if (typeof window.initMap === 'function') {
                window.initMap();
                const checkMap = setInterval(() => {
                    if (window.mapInstance && window.layerGroup) {
                        console.log('✅ Mapa pronto!');
                        clearInterval(checkMap);
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(checkMap);
                    if (!window.mapInstance) {
                        reject(new Error('Timeout: Mapa não criado em 5 segundos'));
                    }
                }, 5000);
            } else {
                reject(new Error('Função initMap não encontrada'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

async function addPolygonsAndWait() {
    return new Promise((resolve, reject) => {
        try {
            if (typeof window.addPolygonsToMap === 'function') {
                window.addPolygonsToMap();
                let attempts = 0;
                const maxAttempts = 60; // 30 segundos
                const checkProgress = setInterval(() => {
                    attempts++;
                    const polygonCount = window.layerGroup?.getLayers().length || 0;
                    if (polygonCount > 0) {
                        console.log(`✅ Polígonos adicionados: ${polygonCount}`);
                        clearInterval(checkProgress);
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        console.warn('⚠️ Timeout ao aguardar polígonos, mas continuando...');
                        clearInterval(checkProgress);
                        resolve(); // Continuar mesmo sem polígonos
                    }
                }, 500);
            } else {
                reject(new Error('Função addPolygonsToMap não encontrada'));
            }
        } catch (error) {
            console.warn('⚠️ Erro ao adicionar polígonos, mas continuando:', error);
            resolve(); // Continuar mesmo com erro
        }
    });
}

// ================================
// FUNÇÕES UTILITÁRIAS
// ================================
function getMediaDoBairro(bairro) {
    return estatisticasPorBairro[bairro] || {
        media_producao_mensal: new Array(12).fill(0),
        media_radiacao_mensal: new Array(12).fill(0)
    };
}

function verificarIntegridadeDados() {
    console.log('🔍 === VERIFICAÇÃO DE INTEGRIDADE DOS DADOS ===');
    
    if (!dadosCompletos || dadosCompletos.length === 0) {
        console.error('❌ Nenhum dado carregado');
        return false;
    }
    
    let problemas = [];
    let sucessos = 0;
    
    dadosCompletos.forEach((item, index) => {
        try {
            // Verificar estrutura básica
            if (!item.id) problemas.push(`Item ${index}: sem ID`);
            if (!item.properties) problemas.push(`Item ${index}: sem properties`);
            if (!item.coordinates || item.coordinates.length === 0) problemas.push(`Item ${index}: sem coordenadas`);
            if (!item.centroid || item.centroid.length !== 2) problemas.push(`Item ${index}: centroide inválido`);
            
            // Verificar dados específicos
            if (item.isLinked) {
                if (!item.properties.bairro || item.properties.bairro === 'Não informado') {
                    problemas.push(`Item ${index}: vinculado mas sem bairro`);
                }
                
                if (item.properties.area_edificacao <= 0 && 
                    item.properties.producao_telhado <= 0 && 
                    item.properties.capacidade_por_m2 <= 0) {
                    problemas.push(`Item ${index}: vinculado mas sem valores válidos`);
                }
            }
            
            sucessos++;
            
        } catch (error) {
            problemas.push(`Item ${index}: erro na verificação - ${error.message}`);
        }
    });
    
    console.log(`✅ Itens verificados com sucesso: ${sucessos}`);
    console.log(`⚠️ Problemas encontrados: ${problemas.length}`);
    
    if (problemas.length > 0) {
        console.log('🔍 Primeiros 10 problemas:');
        problemas.slice(0, 10).forEach(problema => console.log(`   ${problema}`));
    }
    
    const integridadePercent = ((sucessos / dadosCompletos.length) * 100).toFixed(1);
    console.log(`📊 Integridade dos dados: ${integridadePercent}%`);
    
    return integridadePercent >= 90; // Considera bom se >= 90%
}

function exportarEstatisticas() {
    console.log('📤 === EXPORTANDO ESTATÍSTICAS ===');
    
    const estatisticasCompletas = {
        timestamp: new Date().toISOString(),
        dados_globais: {
            total_itens: dadosCompletos.length,
            itens_vinculados: dadosCompletos.filter(item => item.isLinked).length,
            taxa_vinculacao: ((dadosCompletos.filter(item => item.isLinked).length / dadosCompletos.length) * 100).toFixed(1) + '%'
        },
        estatisticas_gerais: estatisticas,
        bairros: Object.keys(estatisticasPorBairro).map(bairro => ({
            nome: bairro,
            total_imoveis: estatisticasPorBairro[bairro].total_imoveis
        })),
        merge_info: window.estatisticasMerge || {}
    };
    
    const json = JSON.stringify(estatisticasCompletas, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solarmap_estatisticas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ Estatísticas exportadas');
}

// ================================
// EXPORTAÇÕES GLOBAIS
// ================================
window.initializeDashboard = initializeDashboard;
window.dadosCompletos = dadosCompletos;
window.dadosExcel = dadosExcel;
window.dadosGeoJSON = dadosGeoJSON;
window.filtrarDados = filtrarDados;
window.selecionarImovel = selecionarImovel;
window.updateSummaryCards = updateSummaryCards;
window.filtrosAtivos = filtrosAtivos;
window.estatisticas = estatisticas;
window.estatisticasPorBairro = estatisticasPorBairro;
window.imovelSelecionado = imovelSelecionado;
window.formatNumber = formatNumber;
window.diagnosticDataDetailed = diagnosticDataDetailed;
window.getMediaDoBairro = getMediaDoBairro;
window.updateInfoCards = updateInfoCards;
window.updateRelatorio = updateRelatorio;
window.carregarDadosComMerge = carregarDadosComMerge;
window.verificarIntegridadeDados = verificarIntegridadeDados;
window.exportarEstatisticas = exportarEstatisticas;

console.log('✅ DASHBOARD INTEGRADO COM MERGE CARREGADO!');
console.log('🔍 Execute diagnosticDataDetailed() para diagnóstico completo');
console.log('🧪 Execute verificarIntegridadeDados() para verificar integridade');
console.log('📤 Execute exportarEstatisticas() para exportar dados');
