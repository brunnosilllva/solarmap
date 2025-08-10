// ================================
// GRÁFICOS INTERATIVOS - SOLARMAP
// VERSÃO CORRIGIDA COMPLETA - Dados mensais reais conforme especificação
// ================================
let chartProducao;
let chartRadiacao;
const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ================================
// FUNÇÃO PARA GERAR CORES SUAVES (tons de laranja)
// ================================
function generateSoftColors(values) {
    if (!values || values.length === 0) {
        return new Array(12).fill('#FFE4CC');  // Laranja muito claro
    }
    
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal;
    
    return values.map(value => {
        if (range === 0) return '#FFE4CC';
        
        // Normalizar valor entre 0 e 1
        const normalized = (value - minVal) / range;
        
        // Cores em tons de laranja suaves
        if (normalized <= 0.25) {
            return '#FFF8F0';  // Laranja ultra claro
        } else if (normalized <= 0.5) {
            return '#FFE4CC';  // Laranja muito claro
        } else if (normalized <= 0.75) {
            return '#FFD4A3';  // Laranja claro
        } else {
            return '#FFC080';  // Laranja médio
        }
    });
}

// ================================
// INICIALIZAÇÃO DOS GRÁFICOS
// ================================
function initializeCharts() {
    console.log('📊 Inicializando gráficos com dados mensais reais...');
    try {
        destroyCharts();
        initProducaoChart();
        initRadiacaoChart();
        console.log('✅ Gráficos com dados mensais reais inicializados');
    } catch (error) {
        console.error('❌ Erro ao inicializar gráficos:', error);
        throw error;
    }
}

// ================================
// INICIALIZAR GRÁFICO DE PRODUÇÃO - CONFORME ESPECIFICAÇÃO
// ================================
function initProducaoChart() {
    const canvas = document.getElementById('grafico-producao');
    if (!canvas) {
        console.error('❌ Elemento canvas para gráfico de produção não encontrado');
        return;
    }
    
    // ALTA RESOLUÇÃO: Configurar canvas para DPI alto
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    const defaultColors = generateSoftColors(new Array(12).fill(100));
    
    chartProducao = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Produção do Imóvel (kW)',
                    data: new Array(12).fill(0),
                    backgroundColor: defaultColors,
                    borderColor: defaultColors.map(color => color.replace('#', '#').concat('CC')),
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                    order: 2  // Barras atrás
                },
                {
                    label: 'Média Geral (kW)',
                    data: new Array(12).fill(0),
                    type: 'line',
                    borderColor: '#E74C3C',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 4,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#E74C3C',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    order: 1  // Linha na frente
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: dpr,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                title: {
                    display: true,
                    text: '🔋 Produção Mensal de Energia',  // CONFORME ESPECIFICAÇÃO
                    font: {
                        size: 18,
                        weight: 'bold',
                        family: "'Segoe UI', Arial, sans-serif"
                    },
                    color: '#1e3a5f',
                    padding: 20
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#E74C3C',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const valor = context.raw;
                            const label = context.dataset.label || '';
                            const valorFormatado = window.formatNumber ? 
                                window.formatNumber(valor, 2) : 
                                valor.toFixed(2);
                            return `${label}: ${valorFormatado} kW`;
                        },
                        afterBody: function(context) {
                            if (window.imovelSelecionado) {
                                return `Bairro: ${window.imovelSelecionado.properties.bairro}`;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Produção (kW)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)',
                        lineWidth: 1
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Meses',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// ================================
// INICIALIZAR GRÁFICO DE RADIAÇÃO - CONFORME ESPECIFICAÇÃO
// ================================
function initRadiacaoChart() {
    const canvas = document.getElementById('grafico-radiacao');
    if (!canvas) {
        console.error('❌ Elemento canvas para gráfico de radiação não encontrado');
        return;
    }
    
    // ALTA RESOLUÇÃO: Configurar canvas para DPI alto
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    const defaultColors = generateSoftColors(new Array(12).fill(150));
    
    chartRadiacao = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Radiação do Imóvel (kW/m²)',
                    data: new Array(12).fill(0),
                    backgroundColor: defaultColors,
                    borderColor: defaultColors.map(color => color.replace('#', '#').concat('CC')),
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                    order: 2  // Barras atrás
                },
                {
                    label: 'Média Geral (kW/m²)',
                    data: new Array(12).fill(0),
                    type: 'line',
                    borderColor: '#F39C12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    borderWidth: 4,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#F39C12',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    borderDash: [5, 5],
                    order: 1  // Linha na frente
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: dpr,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                title: {
                    display: true,
                    text: '☀️ Radiação Solar Mensal',  // CONFORME ESPECIFICAÇÃO
                    font: {
                        size: 18,
                        weight: 'bold',
                        family: "'Segoe UI', Arial, sans-serif"
                    },
                    color: '#1e3a5f',
                    padding: 20
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#F39C12',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const valor = context.raw;
                            const label = context.dataset.label || '';
                            const valorFormatado = window.formatNumber ? 
                                window.formatNumber(valor, 2) : 
                                valor.toFixed(2);
                            return `${label}: ${valorFormatado} kW/m²`;
                        },
                        afterBody: function(context) {
                            if (window.imovelSelecionado) {
                                return `Bairro: ${window.imovelSelecionado.properties.bairro}`;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Radiação (kW/m²)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)',
                        lineWidth: 1
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Meses',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// ================================
// ATUALIZAR GRÁFICOS COM DADOS MENSAIS REAIS - CONFORME ESPECIFICAÇÃO
// ================================
function updateCharts(imovel = null) {
    if (!imovel) {
        resetCharts();
        return;
    }
    
    const props = imovel.properties;
    const bairro = props.bairro || 'Não informado';
    
    console.log('📊 === DEBUG ATUALIZAÇÃO GRÁFICOS CORRIGIDA ===');
    console.log(`Imóvel: ${imovel.id}, Bairro: ${bairro}`);
    console.log('Dados mensais produção:', props.dados_mensais_producao);
    console.log('Dados mensais radiação:', props.dados_mensais_radiacao);
    
    // USAR DADOS MENSAIS REAIS CONFORME ESPECIFICAÇÃO
    let producaoMensal = new Array(12).fill(0);
    let radiacaoMensal = new Array(12).fill(0);
    
    // Para PRODUÇÃO: usar dados mensais das colunas especificadas
    if (props.dados_mensais_producao && props.dados_mensais_producao.length === 12) {
        const temDadosReais = props.dados_mensais_producao.some(valor => valor > 0);
        if (temDadosReais) {
            producaoMensal = props.dados_mensais_producao;
            console.log('✅ Usando dados mensais REAIS de produção:', producaoMensal);
        } else {
            // Fallback: distribuir producao_telhado pelos meses
            producaoMensal = distribuirProducaoAnual(props.producao_telhado || 0);
            console.log('⚠️ Dados mensais zerados, distribuindo produção anual:', props.producao_telhado);
        }
    } else {
        // Fallback: distribuir producao_telhado pelos meses
        producaoMensal = distribuirProducaoAnual(props.producao_telhado || 0);
        console.log('⚠️ Dados mensais não encontrados, distribuindo produção anual:', props.producao_telhado);
    }
    
    // Para RADIAÇÃO: usar dados mensais das colunas especificadas
    if (props.dados_mensais_radiacao && props.dados_mensais_radiacao.length === 12) {
        const temDadosReaisRadiacao = props.dados_mensais_radiacao.some(valor => valor > 0);
        if (temDadosReaisRadiacao) {
            radiacaoMensal = props.dados_mensais_radiacao;
            console.log('✅ Usando dados mensais REAIS de radiação:', radiacaoMensal);
        } else {
            // Fallback: distribuir radiacao_max pelos meses
            radiacaoMensal = distribuirRadiacaoAnual(props.radiacao_max || 0);
            console.log('⚠️ Dados mensais de radiação zerados, distribuindo radiação anual:', props.radiacao_max);
        }
    } else {
        // Fallback: distribuir radiacao_max pelos meses
        radiacaoMensal = distribuirRadiacaoAnual(props.radiacao_max || 0);
        console.log('⚠️ Dados mensais de radiação não encontrados, distribuindo radiação anual:', props.radiacao_max);
    }
    
    // Calcular médias gerais para linha de referência
    const mediaGeralProducao = calcularMediaGeral('producao');
    const mediaGeralRadiacao = calcularMediaGeral('radiacao');

    // Gerar cores suaves baseadas nos valores REAIS
    const coresProducao = generateSoftColors(producaoMensal);
    const coresRadiacao = generateSoftColors(radiacaoMensal);

    // Atualizar gráfico de produção
    if (chartProducao) {
        chartProducao.data.datasets[0].data = producaoMensal;
        chartProducao.data.datasets[0].backgroundColor = coresProducao;
        chartProducao.data.datasets[0].borderColor = coresProducao.map(color => 
            color.replace('#', '#').concat('CC')
        );
        // Usar média geral
        chartProducao.data.datasets[1].data = mediaGeralProducao;
        chartProducao.data.datasets[1].label = 'Média Geral (kW)';
        chartProducao.update('active');
        
        console.log('📊 Produção - Dados aplicados:', chartProducao.data.datasets[0].data);
        console.log('📊 Produção - Média geral:', chartProducao.data.datasets[1].data);
    }

    // Atualizar gráfico de radiação
    if (chartRadiacao) {
        chartRadiacao.data.datasets[0].data = radiacaoMensal;
        chartRadiacao.data.datasets[0].backgroundColor = coresRadiacao;
        chartRadiacao.data.datasets[0].borderColor = coresRadiacao.map(color => 
            color.replace('#', '#').concat('CC')
        );
        // Usar média geral
        chartRadiacao.data.datasets[1].data = mediaGeralRadiacao;
        chartRadiacao.data.datasets[1].label = 'Média Geral (kW/m²)';
        chartRadiacao.update('active');
        
        console.log('📊 Radiação - Dados aplicados:', chartRadiacao.data.datasets[0].data);
        console.log('📊 Radiação - Média geral:', chartRadiacao.data.datasets[1].data);
    }
    
    console.log(`📊 Gráficos atualizados para imóvel ${imovel.id} no bairro ${bairro}`);
    console.log(`📈 Máximo produção mensal: ${Math.max(...producaoMensal).toFixed(2)} kW`);
    console.log(`📈 Máximo radiação mensal: ${Math.max(...radiacaoMensal).toFixed(2)} kW/m²`);
}

// ================================
// DISTRIBUIR PRODUÇÃO ANUAL PELOS MESES (PADRÃO SAZONAL)
// ================================
function distribuirProducaoAnual(producaoAnual) {
    if (!producaoAnual || producaoAnual === 0) {
        return new Array(12).fill(0);
    }
    
    // Fatores sazonais para São Luís (maior produção no final do ano)
    const fatoresSazonais = [1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
    const somaFatores = fatoresSazonais.reduce((sum, fator) => sum + fator, 0);
    
    return fatoresSazonais.map(fator => {
        return (producaoAnual * fator) / somaFatores;
    });
}

// ================================
// DISTRIBUIR RADIAÇÃO ANUAL PELOS MESES (PADRÃO SAZONAL)
// ================================
function distribuirRadiacaoAnual(radiacaoAnual) {
    if (!radiacaoAnual || radiacaoAnual === 0) {
        return new Array(12).fill(0);
    }
    
    // Fatores sazonais para radiação em São Luís
    const fatoresSazonais = [1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3];
    const somaFatores = fatoresSazonais.reduce((sum, fator) => sum + fator, 0);
    
    return fatoresSazonais.map(fator => {
        return (radiacaoAnual * fator) / somaFatores;
    });
}

// ================================
// CALCULAR MÉDIA GERAL PARA LINHA DE REFERÊNCIA
// ================================
function calcularMediaGeral(tipo) {
    if (!window.dadosCompletos || window.dadosCompletos.length === 0) {
        return new Array(12).fill(0);
    }
    
    const dadosComValores = window.dadosCompletos.filter(item => {
        if (tipo === 'producao') {
            return item.properties?.producao_telhado > 0 ||
                   (item.properties?.dados_mensais_producao && 
                    item.properties.dados_mensais_producao.some(v => v > 0));
        } else {
            return item.properties?.radiacao_max > 0 ||
                   (item.properties?.dados_mensais_radiacao && 
                    item.properties.dados_mensais_radiacao.some(v => v > 0));
        }
    });
    
    if (dadosComValores.length === 0) {
        return new Array(12).fill(0);
    }
    
    const mediaMensal = new Array(12).fill(0);
    
    for (let mes = 0; mes < 12; mes++) {
        let somaMes = 0;
        let contadorMes = 0;
        
        dadosComValores.forEach(item => {
            let valorMes = 0;
            
            if (tipo === 'producao') {
                if (item.properties.dados_mensais_producao && 
                    item.properties.dados_mensais_producao[mes] > 0) {
                    valorMes = item.properties.dados_mensais_producao[mes];
                } else if (item.properties.producao_telhado > 0) {
                    // Distribuir produção anual
                    const distribuicao = distribuirProducaoAnual(item.properties.producao_telhado);
                    valorMes = distribuicao[mes];
                }
            } else {
                if (item.properties.dados_mensais_radiacao && 
                    item.properties.dados_mensais_radiacao[mes] > 0) {
                    valorMes = item.properties.dados_mensais_radiacao[mes];
                } else if (item.properties.radiacao_max > 0) {
                    // Distribuir radiação anual
                    const distribuicao = distribuirRadiacaoAnual(item.properties.radiacao_max);
                    valorMes = distribuicao[mes];
                }
            }
            
            if (valorMes > 0) {
                somaMes += valorMes;
                contadorMes++;
            }
        });
        
        mediaMensal[mes] = contadorMes > 0 ? somaMes / contadorMes : 0;
    }
    
    return mediaMensal;
}

// ================================
// RESETAR GRÁFICOS
// ================================
function resetCharts() {
    const defaultColors = generateSoftColors(new Array(12).fill(0));
    
    if (chartProducao) {
        chartProducao.data.datasets[0].data = new Array(12).fill(0);
        chartProducao.data.datasets[0].backgroundColor = defaultColors;
        chartProducao.data.datasets[0].borderColor = defaultColors.map(color => 
            color.replace('#', '#').concat('CC')
        );
        chartProducao.data.datasets[1].data = new Array(12).fill(0);
        chartProducao.data.datasets[1].label = 'Média Geral (kW)';
        chartProducao.update('none');
    }
    if (chartRadiacao) {
        chartRadiacao.data.datasets[0].data = new Array(12).fill(0);
        chartRadiacao.data.datasets[0].backgroundColor = defaultColors;
        chartRadiacao.data.datasets[0].borderColor = defaultColors.map(color => 
            color.replace('#', '#').concat('CC')
        );
        chartRadiacao.data.datasets[1].data = new Array(12).fill(0);
        chartRadiacao.data.datasets[1].label = 'Média Geral (kW/m²)';
        chartRadiacao.update('none');
    }
    console.log('🔄 Gráficos resetados');
}

// ================================
// REDIMENSIONAR GRÁFICOS
// ================================
function resizeCharts() {
    if (chartProducao) {
        chartProducao.resize();
    }
    if (chartRadiacao) {
        chartRadiacao.resize();
    }
}

// ================================
// DESTRUIR GRÁFICOS
// ================================
function destroyCharts() {
    if (chartProducao) {
        chartProducao.destroy();
        chartProducao = null;
    }
    if (chartRadiacao) {
        chartRadiacao.destroy();
        chartRadiacao = null;
    }
}

// ================================
// DIAGNÓSTICO DOS GRÁFICOS
// ================================
function diagnosticCharts() {
    console.log('🔍 === DIAGNÓSTICO DOS GRÁFICOS CORRIGIDO ===');
    
    if (chartProducao) {
        console.log('📊 Gráfico de Produção - Dados do Imóvel:', chartProducao.data.datasets[0].data);
        console.log('📊 Gráfico de Produção - Média Geral:', chartProducao.data.datasets[1].data);
        console.log('📊 Gráfico de Produção - Label:', chartProducao.data.datasets[1].label);
    } else {
        console.log('❌ Gráfico de Produção não inicializado');
    }
    
    if (chartRadiacao) {
        console.log('📊 Gráfico de Radiação - Dados do Imóvel:', chartRadiacao.data.datasets[0].data);
        console.log('📊 Gráfico de Radiação - Média Geral:', chartRadiacao.data.datasets[1].data);
        console.log('📊 Gráfico de Radiação - Label:', chartRadiacao.data.datasets[1].label);
    } else {
        console.log('❌ Gráfico de Radiação não inicializado');
    }
    
    // Verificar dados disponíveis
    if (window.dadosCompletos && window.dadosCompletos.length > 0) {
        const dadosComProducao = window.dadosCompletos.filter(item => 
            item.properties?.producao_telhado > 0 ||
            (item.properties?.dados_mensais_producao && 
             item.properties.dados_mensais_producao.some(v => v > 0))
        );
        
        const dadosComRadiacao = window.dadosCompletos.filter(item => 
            item.properties?.radiacao_max > 0 ||
            (item.properties?.dados_mensais_radiacao && 
             item.properties.dados_mensais_radiacao.some(v => v > 0))
        );
        
        console.log(`📊 Dados com produção válida: ${dadosComProducao.length}`);
        console.log(`📊 Dados com radiação válida: ${dadosComRadiacao.length}`);
        
        if (dadosComProducao.length > 0) {
            const exemplo = dadosComProducao[0];
            console.log(`📊 Exemplo - Produção telhado: ${exemplo.properties.producao_telhado}`);
            console.log(`📊 Exemplo - Dados mensais produção:`, exemplo.properties.dados_mensais_producao);
        }
        
        if (dadosComRadiacao.length > 0) {
            const exemplo = dadosComRadiacao[0];
            console.log(`📊 Exemplo - Radiação max: ${exemplo.properties.radiacao_max}`);
            console.log(`📊 Exemplo - Dados mensais radiação:`, exemplo.properties.dados_mensais_radiacao);
        }
    }
}

// ================================
// TESTAR GRÁFICOS COM DADOS REAIS
// ================================
function testarGraficosComDados() {
    console.log('🧪 === TESTE DOS GRÁFICOS COM DADOS REAIS ===');
    
    if (!window.dadosCompletos || window.dadosCompletos.length === 0) {
        console.error('❌ Nenhum dado disponível para teste');
        return;
    }
    
    // Procurar um imóvel com dados válidos
    const imovelComDados = window.dadosCompletos.find(item => 
        item.properties?.producao_telhado > 0 || 
        item.properties?.radiacao_max > 0 ||
        (item.properties?.dados_mensais_producao && 
         item.properties.dados_mensais_producao.some(v => v > 0)) ||
        (item.properties?.dados_mensais_radiacao && 
         item.properties.dados_mensais_radiacao.some(v => v > 0))
    );
    
    if (imovelComDados) {
        console.log(`🧪 Testando com imóvel ${imovelComDados.id}:`);
        console.log('  - Bairro:', imovelComDados.properties.bairro);
        console.log('  - Produção telhado:', imovelComDados.properties.producao_telhado);
        console.log('  - Radiação max:', imovelComDados.properties.radiacao_max);
        console.log('  - Dados mensais produção:', imovelComDados.properties.dados_mensais_producao);
        console.log('  - Dados mensais radiação:', imovelComDados.properties.dados_mensais_radiacao);
        
        updateCharts(imovelComDados);
        console.log('✅ Teste dos gráficos concluído');
    } else {
        console.error('❌ Nenhum imóvel com dados válidos encontrado');
    }
}

// ================================
// EVENTOS DE REDIMENSIONAMENTO
// ================================
window.addEventListener('resize', function() {
    setTimeout(resizeCharts, 100);
});

// ================================
// EXPORTAÇÕES GLOBAIS
// ================================
window.initializeCharts = initializeCharts;
window.updateCharts = updateCharts;
window.resizeCharts = resizeCharts;
window.destroyCharts = destroyCharts;
window.diagnosticCharts = diagnosticCharts;
window.generateSoftColors = generateSoftColors;
window.distribuirProducaoAnual = distribuirProducaoAnual;
window.distribuirRadiacaoAnual = distribuirRadiacaoAnual;
window.calcularMediaGeral = calcularMediaGeral;
window.testarGraficosComDados = testarGraficosComDados;

console.log('✅ GRÁFICOS CORRIGIDOS COMPLETOS - Dados mensais reais conforme especificação!');
console.log('🧪 Execute testarGraficosComDados() para teste');
console.log('🔍 Execute diagnosticCharts() para diagnóstico');
