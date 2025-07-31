// ================================
// GRÁFICOS INTERATIVOS - SOLARMAP
// VERSÃO NOVA SEM CONFLITOS DE VARIÁVEIS
// ================================

// Limpar variáveis globais existentes
if (typeof window.chartProducaoSolar !== 'undefined' && window.chartProducaoSolar) {
    window.chartProducaoSolar.destroy();
}
if (typeof window.chartRadiacaoSolar !== 'undefined' && window.chartRadiacaoSolar) {
    window.chartRadiacaoSolar.destroy();
}

// Novas variáveis com nomes únicos
let chartProducaoSolar = null;
let chartRadiacaoSolar = null;
const mesesAno = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ================================
// FUNÇÃO PARA GERAR CORES SUAVES
// ================================
function gerarCoresSuaves(values) {
    if (!values || values.length === 0) {
        return new Array(12).fill('#FFF5E6');
    }
    
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal;
    
    return values.map(value => {
        if (range === 0) return '#FFF5E6';
        
        const normalized = (value - minVal) / range;
        
        if (normalized <= 0.25) {
            return '#FFF8F0';
        } else if (normalized <= 0.5) {
            return '#FFF0E6';
        } else if (normalized <= 0.75) {
            return '#FFE4CC';
        } else {
            return '#FFD4A3';
        }
    });
}

// ================================
// INICIALIZAÇÃO DOS GRÁFICOS
// ================================
function inicializarGraficos() {
    console.log('📊 Inicializando gráficos limpos...');
    try {
        destruirGraficos();
        criarGraficoProducao();
        criarGraficoRadiacao();
        console.log('✅ Gráficos inicializados');
    } catch (error) {
        console.error('❌ Erro ao inicializar gráficos:', error);
    }
}

// ================================
// CRIAR GRÁFICO DE PRODUÇÃO
// ================================
function criarGraficoProducao() {
    const canvas = document.getElementById('grafico-producao');
    if (!canvas) {
        console.error('❌ Canvas de produção não encontrado');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const defaultColors = gerarCoresSuaves(new Array(12).fill(100));
    
    chartProducaoSolar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: mesesAno,
            datasets: [
                {
                    label: 'Produção do Imóvel (kW)',
                    data: new Array(12).fill(0),
                    backgroundColor: defaultColors,
                    borderColor: defaultColors.map(color => color + 'CC'),
                    borderWidth: 1,
                    borderRadius: 4,
                    order: 2
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
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '🔋 Produção Mensal de Energia',
                    font: { size: 18, weight: 'bold' },
                    color: '#1e3a5f',
                    padding: 20
                },
                legend: {
                    display: true,
                    position: 'top'
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
                            // FORMATAÇÃO BRASILEIRA MANUAL
                            const valorFixo = parseFloat(valor).toFixed(2);
                            const [parteInteira, parteDecimal] = valorFixo.split('.');
                            const inteiraFormatada = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                            const valorFormatado = inteiraFormatada + ',' + parteDecimal;
                            return `${label}: ${valorFormatado} kW`;
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
                        font: { size: 14, weight: 'bold' }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Meses',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            }
        }
    });
    
    // Exportar globalmente
    window.chartProducaoSolar = chartProducaoSolar;
}

// ================================
// CRIAR GRÁFICO DE RADIAÇÃO
// ================================
function criarGraficoRadiacao() {
    const canvas = document.getElementById('grafico-radiacao');
    if (!canvas) {
        console.error('❌ Canvas de radiação não encontrado');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const defaultColors = gerarCoresSuaves(new Array(12).fill(150));
    
    chartRadiacaoSolar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: mesesAno,
            datasets: [
                {
                    label: 'Radiação do Imóvel (kW/m²)',
                    data: new Array(12).fill(0),
                    backgroundColor: defaultColors,
                    borderColor: defaultColors.map(color => color + 'CC'),
                    borderWidth: 1,
                    borderRadius: 4,
                    order: 2
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
                    borderDash: [5, 5],
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '☀️ Radiação Solar Mensal',
                    font: { size: 18, weight: 'bold' },
                    color: '#1e3a5f',
                    padding: 20
                },
                legend: {
                    display: true,
                    position: 'top'
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
                            // FORMATAÇÃO BRASILEIRA MANUAL
                            const valorFixo = parseFloat(valor).toFixed(2);
                            const [parteInteira, parteDecimal] = valorFixo.split('.');
                            const inteiraFormatada = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                            const valorFormatado = inteiraFormatada + ',' + parteDecimal;
                            return `${label}: ${valorFormatado} kW/m²`;
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
                        font: { size: 14, weight: 'bold' }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Meses',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            }
        }
    });
    
    // Exportar globalmente
    window.chartRadiacaoSolar = chartRadiacaoSolar;
}

// ================================
// ATUALIZAR GRÁFICOS
// ================================
function atualizarGraficos(imovel = null) {
    if (!imovel) {
        resetarGraficos();
        return;
    }
    
    console.log('📊 Atualizando gráficos para imóvel:', imovel.id);
    
    // Dados simulados por enquanto
    const dadosSimulados = gerarDadosSimulados(100);
    const coresProducao = gerarCoresSuaves(dadosSimulados);
    
    // Atualizar gráfico de produção
    if (chartProducaoSolar) {
        chartProducaoSolar.data.datasets[0].data = dadosSimulados;
        chartProducaoSolar.data.datasets[0].backgroundColor = coresProducao;
        chartProducaoSolar.data.datasets[1].data = dadosSimulados.map(v => v * 0.8);
        chartProducaoSolar.update('active');
    }
    
    // Atualizar gráfico de radiação
    if (chartRadiacaoSolar) {
        chartRadiacaoSolar.data.datasets[0].data = dadosSimulados;
        chartRadiacaoSolar.data.datasets[0].backgroundColor = coresProducao;
        chartRadiacaoSolar.data.datasets[1].data = dadosSimulados.map(v => v * 0.9);
        chartRadiacaoSolar.update('active');
    }
}

// ================================
// FUNÇÕES AUXILIARES
// ================================
function gerarDadosSimulados(baseValue) {
    const seasonalFactors = [1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
    return seasonalFactors.map(factor => {
        const variation = 0.8 + (Math.random() * 0.4);
        return (baseValue / 12) * factor * variation;
    });
}

function resetarGraficos() {
    const defaultColors = gerarCoresSuaves(new Array(12).fill(0));
    
    if (chartProducaoSolar) {
        chartProducaoSolar.data.datasets[0].data = new Array(12).fill(0);
        chartProducaoSolar.data.datasets[0].backgroundColor = defaultColors;
        chartProducaoSolar.data.datasets[1].data = new Array(12).fill(0);
        chartProducaoSolar.update('none');
    }
    
    if (chartRadiacaoSolar) {
        chartRadiacaoSolar.data.datasets[0].data = new Array(12).fill(0);
        chartRadiacaoSolar.data.datasets[0].backgroundColor = defaultColors;
        chartRadiacaoSolar.data.datasets[1].data = new Array(12).fill(0);
        chartRadiacaoSolar.update('none');
    }
}

function destruirGraficos() {
    if (chartProducaoSolar) {
        chartProducaoSolar.destroy();
        chartProducaoSolar = null;
    }
    if (chartRadiacaoSolar) {
        chartRadiacaoSolar.destroy();
        chartRadiacaoSolar = null;
    }
}

// ================================
// EXPORTAÇÕES GLOBAIS
// ================================
window.initializeCharts = inicializarGraficos;
window.updateCharts = atualizarGraficos;
window.resetCharts = resetarGraficos;
window.destroyCharts = destruirGraficos;

console.log('✅ GRÁFICOS NOVO - SEM CONFLITOS!');
