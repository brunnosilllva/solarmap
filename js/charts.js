// ================================
// GRÁFICOS INTERATIVOS - SOLARMAP
// VERSÃO CORRIGIDA: FORMATAÇÃO BRASILEIRA
// ================================
let chartProducao;
let chartRadiacao;
const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ================================
// FUNÇÃO DE FORMATAÇÃO BRASILEIRA PARA GRÁFICOS
// ================================
function formatarNumeroBrasileiroChart(numero, decimais = 2) {
    if (numero === null || numero === undefined || isNaN(numero)) {
        return '0,00';
    }
    
    const num = typeof numero === 'string' ? parseFloat(numero) : numero;
    
    if (isNaN(num)) {
        return '0,00';
    }
    
    // Formatação brasileira: vírgula para decimal, ponto para milhar
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais
    });
}

// ================================
// FUNÇÃO PARA GERAR CORES SUAVES (EXPANDIDA)
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
        
        // Cores suaves expandidas para melhor visualização
        if (normalized <= 0.125) {
            return '#FFF8F0';  // Laranja ultra claro 1
        } else if (normalized <= 0.25) {
            return '#FFF0E6';  // Laranja ultra claro 2
        } else if (normalized <= 0.375) {
            return '#FFE8D6';  // Laranja muito claro 1
        } else if (normalized <= 0.5) {
            return '#FFE0C7';  // Laranja muito claro 2
        } else if (normalized <= 0.625) {
            return '#FFD8B8';  // Laranja claro 1
        } else if (normalized <= 0.75) {
            return '#FFD0A8';  // Laranja claro 2
        } else if (normalized <= 0.875) {
            return '#FFC080';  // Laranja médio claro
        } else {
            return '#FFB366';  // Laranja médio
        }
    });
}

// ================================
// INICIALIZAÇÃO DOS GRÁFICOS
// ================================
function initializeCharts() {
    console.log('📊 Inicializando gráficos com formatação brasileira...');
    try {
        destroyCharts();
        initProducaoChart();
        initRadiacaoChart();
        console.log('✅ Gráficos com formatação brasileira inicializados');
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
                    text: '🔋 Produção Mensal de Energia',
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
                            const label = context.dataset.label || '';
                            const value = formatarNumeroBrasileiroChart(context.parsed.y, 2);
                            return `${label}: ${value}`;
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
                    },
                    ticks: {
                        callback: function(value) {
                            return formatarNumeroBrasileiroChart(value, 1);
                        }
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
                            const label = context.dataset.label || '';
                            const value = formatarNumeroBrasileiroChart(context.parsed.y, 2);
                            return `${label}: ${value}`;
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
                    },
                    ticks: {
                        callback: function(value) {
                            return formatarNumeroBrasileiroChart(value, 1);
                        }
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
// ATUALIZAR GRÁFICOS COM MÉDIA DO BAIRRO
// ================================
function updateCharts(imovel = null) {
    if (!imovel) {
        resetCharts();
        return;
    }
    
    const props = imovel.properties;
    const bairro = props.bairro || 'Não informado';
    
    // Gerar dados mensais simulados para o imóvel
    const producaoMensal = generateMockMonthlyData(props.producao_telhado || 0);
    const radiacaoMensal = generateMockMonthlyData(props.radiacao_max || 0);
    
    // Obter médias do bairro
    const mediaDoBairro = window.getMediaDoBairro ? window.getMediaDoBairro(bairro) : {
        media_producao_mensal: new Array(12).fill(0),
        media_radiacao_mensal: new Array(12).fill(0)
    };

    // Gerar cores suaves baseadas nos valores
    const coresProducao = generateSoftColors(producaoMensal);
    const coresRadiacao = generateSoftColors(radiacaoMensal);

    // Atualizar gráfico de produção
    if (chartProducao) {
        chartProducao.data.datasets[0].data = producaoMensal;
        chartProducao.data.datasets[0].backgroundColor = coresProducao;
        chartProducao.data.datasets[0].borderColor = coresProducao.map(color => 
            color.replace('#', '#').concat('CC')
        );
        // CORRIGIDO: Usar média do bairro
        chartProducao.data.datasets[1].data = mediaDoBairro.media_producao_mensal;
        chartProducao.data.datasets[1].label = `Média do Bairro: ${bairro}`;
        chartProducao.update('active');
    }

    // Atualizar gráfico de radiação
    if (chartRadiacao) {
        chartRadiacao.data.datasets[0].data = radiacaoMensal;
        chartRadiacao.data.datasets[0].backgroundColor = coresRadiacao;
        chartRadiacao.data.datasets[0].borderColor = coresRadiacao.map(color => 
            color.replace('#', '#').concat('CC')
        );
        // CORRIGIDO: Usar média do bairro
        chartRadiacao.data.datasets[1].data = mediaDoBairro.media_radiacao_mensal;
        chartRadiacao.data.datasets[1].label = `Média do Bairro: ${bairro}`;
        chartRadiacao.update('active');
    }
    
    console.log(`📊 Gráficos atualizados com formatação brasileira para imóvel ${imovel.id} no bairro ${bairro}`);
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
    console.log('🔄 Gráficos resetados com formatação brasileira');
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
    console.log('🔍 === DIAGNÓSTICO DOS GRÁFICOS COM FORMATAÇÃO BR ===');
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
window.formatarNumeroBrasileiroChart = formatarNumeroBrasileiroChart;

console.log('✅ GRÁFICOS COM FORMATAÇÃO BRASILEIRA - Implementado!');
