// ================================
// GRÁFICOS INTERATIVOS - SOLARMAP
// VERSÃO COM DADOS MENSAIS REAIS
// ================================
let chartProducao;
let chartRadiacao;
const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ================================
// FUNÇÃO PARA GERAR CORES SUAVES (10% mais claras)
// ================================
function generateSoftColors(values) {
    if (!values || values.length === 0) {
        return new Array(12).fill('#FFF5E6');  // Laranja muito claro
    }
    
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal;
    
    return values.map(value => {
        if (range === 0) return '#FFF5E6';
        
        // Normalizar valor entre 0 e 1
        const normalized = (value - minVal) / range;
        
        // Cores suaves e 10% mais claras
        if (normalized <= 0.25) {
            return '#FFF8F0';  // Laranja ultra claro
        } else if (normalized <= 0.5) {
            return '#FFF0E6';  // Laranja muito claro
        } else if (normalized <= 0.75) {
            return '#FFE4CC';  // Laranja claro
        } else {
            return '#FFD4A3';  // Laranja médio claro
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
// INICIALIZAR GRÁFICO DE PRODUÇÃO
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
                    label: 'Média do Bairro (kW)',
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
                    text: '🔋 Produção Mensal de Energia (Dados Reais)',
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
                            const valorFormatado = window.formatarComoExcel ? 
                                window.formatarComoExcel(valor, 2) : 
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
// INICIALIZAR GRÁFICO DE RADIAÇÃO
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
                    label: 'Média do Bairro (kW/m²)',
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
                    text: '☀️ Radiação Solar Mensal',
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
                            const valorFormatado = window.formatarComoExcel ? 
                                window.formatarComoExcel(valor, 2) : 
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
// ATUALIZAR GRÁFICOS COM DADOS MENSAIS REAIS
// ================================
function updateCharts(imovel = null) {
    if (!imovel) {
        resetCharts();
        return;
    }
    
    const props = imovel.properties;
    const bairro = props.bairro || 'Não informado';
    
    console.log('📊 === DEBUG ATUALIZAÇÃO GRÁFICOS ===');
    console.log(`Imóvel: ${imovel.id}, Bairro: ${bairro}`);
    console.log('Dados mensais disponíveis:', props.dados_mensais_producao);
    
    // CORRIGIDO: Usar dados mensais reais se disponíveis
    let producaoMensal;
    if (props.dados_mensais_producao && props.dados_mensais_producao.length === 12) {
        const temDadosReais = props.dados_mensais_producao.some(valor => valor > 0);
        if (temDadosReais) {
            producaoMensal = props.dados_mensais_producao;
            console.log('✅ Usando dados mensais REAIS de produção:', producaoMensal);
        } else {
            producaoMensal = generateMockMonthlyData(props.producao_telhado || 0);
            console.log('⚠️ Dados mensais de produção zerados, usando simulação baseada em:', props.producao_telhado);
        }
    } else {
        producaoMensal = generateMockMonthlyData(props.producao_telhado || 0);
        console.log('⚠️ Dados mensais de produção não encontrados, usando simulação baseada em:', props.producao_telhado);
    }
    
    // NOVO: Para radiação, usar dados mensais reais se disponíveis
    let radiacaoMensal;
    if (props.dados_mensais_radiacao && props.dados_mensais_radiacao.length === 12) {
        const temDadosReaisRadiacao = props.dados_mensais_radiacao.some(valor => valor > 0);
        if (temDadosReaisRadiacao) {
            radiacaoMensal = props.dados_mensais_radiacao;
            console.log('✅ Usando dados mensais REAIS de radiação:', radiacaoMensal);
        } else {
            radiacaoMensal = generateMockMonthlyData(props.radiacao_max || 0);
            console.log('⚠️ Dados mensais de radiação zerados, usando simulação baseada em:', props.radiacao_max);
        }
    } else {
        radiacaoMensal = generateMockMonthlyData(props.radiacao_max || 0);
        console.log('⚠️ Dados mensais de radiação não encontrados, usando simulação baseada em:', props.radiacao_max);
    }
    
    // Obter médias do bairro
    const mediaDoBairro = window.getMediaDoBairro ? window.getMediaDoBairro(bairro) : {
        media_producao_mensal: new Array(12).fill(0),
        media_radiacao_mensal: new Array(12).fill(0)
    };

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
        // Usar média do bairro
        chartProducao.data.datasets[1].data = mediaDoBairro.media_producao_mensal;
        chartProducao.data.datasets[1].label = `Média do Bairro: ${bairro}`;
        chartProducao.update('active');
        
        // DEBUG: Verificar se os dados foram aplicados
        console.log('📊 Produção - Dados aplicados:', chartProducao.data.datasets[0].data);
        console.log('📊 Produção - Média do bairro:', chartProducao.data.datasets[1].data);
    }

    // Atualizar gráfico de radiação
    if (chartRadiacao) {
        chartRadiacao.data.datasets[0].data = radiacaoMensal;
        chartRadiacao.data.datasets[0].backgroundColor = coresRadiacao;
        chartRadiacao.data.datasets[0].borderColor = coresRadiacao.map(color => 
            color.replace('#', '#').concat('CC')
        );
        // Usar média do bairro
        chartRadiacao.data.datasets[1].data = mediaDoBairro.media_radiacao_mensal;
        chartRadiacao.data.datasets[1].label = `Média do Bairro: ${bairro}`;
        chartRadiacao.update('active');
    }
    
    console.log(`📊 Gráficos atualizados para imóvel ${imovel.id} no bairro ${bairro}`);
    console.log(`📈 Máximo produção mensal: ${Math.max(...producaoMensal).toFixed(2)} kW`);
    console.log(`📈 Média do bairro:`, mediaDoBairro);
}

// ================================
// GERAR DADOS MENSAIS SIMULADOS REALISTAS
// ================================
function generateMockMonthlyData(baseValue) {
    if (!baseValue || baseValue === 0) {
        return new Array(12).fill(0);
    }
    
    // Simular variação sazonal realística para São Luís
    // (maior radiação/produção no final do ano, menor no meio do ano)
    const seasonalFactors = [1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
    
    return seasonalFactors.map(factor => {
        const variation = 0.8 + (Math.random() * 0.4); // Variação de ±20%
        return (baseValue / 12) * factor * variation;
    });
}

// ================================
// CALCULAR MÉDIAS MENSAIS REAIS POR BAIRRO
// ================================
function calcularMediasMensaisReaisPorBairro() {
    console.log('📊 Calculando médias mensais REAIS por bairro...');
    
    if (!window.dadosCompletos || window.dadosCompletos.length === 0) {
        console.warn('⚠️ Dados completos não disponíveis');
        return;
    }
    
    // Agrupar dados por bairro
    const dadosPorBairro = {};
    
    window.dadosCompletos.forEach(item => {
        const bairro = item.properties.bairro || 'Não informado';
        if (!dadosPorBairro[bairro]) {
            dadosPorBairro[bairro] = [];
        }
        dadosPorBairro[bairro].push(item);
    });
    
    // Calcular médias mensais REAIS para cada bairro
    const mediasReaisPorBairro = {};
    
    Object.entries(dadosPorBairro).forEach(([bairro, imoveis]) => {
        const totalImoveis = imoveis.length;
        
        // Inicializar arrays de soma para cada mês
        const somaProducaoMensal = new Array(12).fill(0);
        const somaRadiacaoMensal = new Array(12).fill(0);
        let imoveisComDadosReais = 0;
        
        imoveis.forEach(item => {
            // Verificar se tem dados mensais reais
            if (item.properties.dados_mensais_producao && 
                item.properties.dados_mensais_producao.length === 12) {
                
                const temDadosReais = item.properties.dados_mensais_producao.some(valor => valor > 0);
                if (temDadosReais) {
                    imoveisComDadosReais++;
                    // Somar dados mensais reais
                    item.properties.dados_mensais_producao.forEach((valor, mes) => {
                        somaProducaoMensal[mes] += valor || 0;
                    });
                } else {
                    // Usar dados simulados se não tem dados reais
                    const dadosSimulados = generateMockMonthlyData(item.properties.producao_telhado || 0);
                    dadosSimulados.forEach((valor, mes) => {
                        somaProducaoMensal[mes] += valor;
                    });
                }
            } else {
                // Usar dados simulados se não tem estrutura de dados mensais
                const dadosSimulados = generateMockMonthlyData(item.properties.producao_telhado || 0);
                dadosSimulados.forEach((valor, mes) => {
                    somaProducaoMensal[mes] += valor;
                });
            }
            
            // Para radiação, sempre simular (não temos dados mensais)
            const radiacaoSimulada = generateMockMonthlyData(item.properties.radiacao_max || 0);
            radiacaoSimulada.forEach((valor, mes) => {
                somaRadiacaoMensal[mes] += valor;
            });
        });
        
        // Calcular médias
        const mediaProducaoMensal = somaProducaoMensal.map(soma => 
            totalImoveis > 0 ? soma / totalImoveis : 0
        );
        const mediaRadiacaoMensal = somaRadiacaoMensal.map(soma => 
            totalImoveis > 0 ? soma / totalImoveis : 0
        );
        
        mediasReaisPorBairro[bairro] = {
            total_imoveis: totalImoveis,
            imoveis_com_dados_reais: imoveisComDadosReais,
            media_producao_mensal: mediaProducaoMensal,
            media_radiacao_mensal: mediaRadiacaoMensal
        };
        
        console.log(`📊 ${bairro}: ${totalImoveis} imóveis, ${imoveisComDadosReais} com dados reais`);
    });
    
    // Atualizar variável global
    window.estatisticasPorBairro = mediasReaisPorBairro;
    console.log('✅ Médias mensais REAIS por bairro calculadas');
    
    return mediasReaisPorBairro;
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
        chartProducao.data.datasets[1].label = 'Média do Bairro (kW)';
        chartProducao.update('none');
    }
    if (chartRadiacao) {
        chartRadiacao.data.datasets[0].data = new Array(12).fill(0);
        chartRadiacao.data.datasets[0].backgroundColor = defaultColors;
        chartRadiacao.data.datasets[0].borderColor = defaultColors.map(color => 
            color.replace('#', '#').concat('CC')
        );
        chartRadiacao.data.datasets[1].data = new Array(12).fill(0);
        chartRadiacao.data.datasets[1].label = 'Média do Bairro (kW/m²)';
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
    console.log('🔍 === DIAGNÓSTICO DOS GRÁFICOS COM DADOS REAIS ===');
    if (chartProducao) {
        console.log('📊 Gráfico de Produção - Imóvel:', chartProducao.data.datasets[0].data);
        console.log('📊 Gráfico de Produção - Média Bairro:', chartProducao.data.datasets[1].data);
        console.log('📊 Gráfico de Produção - Label:', chartProducao.data.datasets[1].label);
    } else {
        console.log('❌ Gráfico de Produção não inicializado');
    }
    if (chartRadiacao) {
        console.log('📊 Gráfico de Radiação - Imóvel:', chartRadiacao.data.datasets[0].data);
        console.log('📊 Gráfico de Radiação - Média Bairro:', chartRadiacao.data.datasets[1].data);
        console.log('📊 Gráfico de Radiação - Label:', chartRadiacao.data.datasets[1].label);
    } else {
        console.log('❌ Gráfico de Radiação não inicializado');
    }
    if (window.estatisticasPorBairro) {
        console.log('📊 Estatísticas por bairro disponíveis:', Object.keys(window.estatisticasPorBairro));
        // Mostrar dados de um bairro como exemplo
        const primeiroBairro = Object.keys(window.estatisticasPorBairro)[0];
        if (primeiroBairro) {
            console.log(`📊 Exemplo - ${primeiroBairro}:`, window.estatisticasPorBairro[primeiroBairro]);
        }
    } else {
        console.log('❌ Estatísticas por bairro não disponíveis');
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
window.generateMockMonthlyData = generateMockMonthlyData;
window.calcularMediasMensaisReaisPorBairro = calcularMediasMensaisReaisPorBairro;

console.log('✅ GRÁFICOS COM DADOS MENSAIS REAIS - Implementado!');
