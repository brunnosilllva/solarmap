// ================================
// SISTEMA DE FILTROS - SOLARMAP
// VERSÃO FINAL CORRIGIDA - Bairros funcionando
// ================================

// ================================
// INICIALIZAÇÃO DOS FILTROS
// ================================
function initializeFilters() {
    console.log('🔍 Inicializando filtros finais corrigidos...');

    try {
        setupFilterEvents();
        
        // Aguardar dados serem carregados antes de popular bairros
        if (window.dadosCompletos && window.dadosCompletos.length > 0) {
            populateBairroSelect();
        } else {
            // Aguardar dados serem carregados
            setTimeout(() => {
                if (window.dadosCompletos && window.dadosCompletos.length > 0) {
                    populateBairroSelect();
                } else {
                    console.warn('⚠️ Dados ainda não carregados, tentando novamente...');
                    setTimeout(populateBairroSelect, 2000);
                }
            }, 1000);
        }
        
        console.log('✅ Filtros inicializados com sucesso');
    } catch (error) {
        console.error('❌ Erro ao inicializar filtros:', error);
        throw error;
    }
}

// ================================
// POPULAR SELECT DE BAIRROS - VERSÃO CORRIGIDA
// ================================
function populateBairroSelect() {
    console.log('🏘️ === POPULANDO BAIRROS (VERSÃO CORRIGIDA) ===');
    
    const select = document.getElementById('bairro-select');
    if (!select) {
        console.error('❌ Select de bairros não encontrado');
        return;
    }

    // Limpar opções existentes
    select.innerHTML = '';

    // Adicionar opção padrão
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Todos os bairros';
    select.appendChild(defaultOption);

    // Verificar se dados estão disponíveis
    if (!window.dadosCompletos || window.dadosCompletos.length === 0) {
        console.warn('⚠️ dadosCompletos não disponível para popular bairros');
        
        // Tentar usar dadosExcel diretamente
        if (window.dadosExcel && window.dadosExcel.length > 0) {
            console.log('🔄 Tentando usar dadosExcel diretamente...');
            const bairrosExcel = [...new Set(
                window.dadosExcel
                    .map(item => item.bairro)
                    .filter(b => b && typeof b === 'string' && b.trim().length > 0)
                    .map(b => b.trim())
            )].sort();
            
            console.log(`📊 Bairros encontrados no Excel: ${bairrosExcel.length}`);
            console.log('📊 Lista:', bairrosExcel);
            
            bairrosExcel.forEach(bairro => {
                const option = document.createElement('option');
                option.value = bairro;
                option.textContent = bairro;
                select.appendChild(option);
            });
            
            console.log(`✅ ${bairrosExcel.length} bairros carregados do Excel`);
            return;
        }
        
        console.error('❌ Nenhum dado disponível para bairros');
        return;
    }

    // Extrair bairros únicos dos dados completos
    const bairrosCompletos = window.dadosCompletos
        .map(item => item.properties?.bairro)
        .filter(b => b && typeof b === 'string' && b.trim().length > 0)
        .map(b => b.trim());
        
    const bairrosUnicos = [...new Set(bairrosCompletos)].sort();

    console.log(`📊 Total de registros: ${window.dadosCompletos.length}`);
    console.log(`📊 Registros com bairro válido: ${bairrosCompletos.length}`);
    console.log(`📊 Bairros únicos encontrados: ${bairrosUnicos.length}`);
    console.log('📊 Lista de bairros únicos:', bairrosUnicos);

    if (bairrosUnicos.length === 0) {
        console.error('❌ PROBLEMA: Nenhum bairro único encontrado!');
        console.log('🔍 Analisando primeiro item:');
        if (window.dadosCompletos.length > 0) {
            const primeiro = window.dadosCompletos[0];
            console.log('  - Properties:', primeiro.properties);
            console.log('  - Bairro field:', primeiro.properties?.bairro);
            console.log('  - ExcelData:', primeiro.excelData);
        }
        return;
    }

    if (bairrosUnicos.length === 1) {
        console.warn(`⚠️ ATENÇÃO: Apenas 1 bairro encontrado: "${bairrosUnicos[0]}"`);
        console.log('🔍 Isto pode indicar um problema nos dados');
        
        // Verificar se há variação nos dados originais
        const amostra = window.dadosCompletos.slice(0, 10).map(item => ({
            id: item.id,
            bairro: item.properties?.bairro,
            excel: item.excelData?.bairro
        }));
        console.log('🔍 Amostra de 10 registros:', amostra);
    }

    // Adicionar opções de bairros
    bairrosUnicos.forEach(bairro => {
        const option = document.createElement('option');
        option.value = bairro;
        option.textContent = bairro;
        select.appendChild(option);
    });

    console.log(`✅ ${bairrosUnicos.length} bairros carregados no filtro com sucesso`);
}

// ================================
// CONFIGURAR EVENTOS DE FILTROS
// ================================
function setupFilterEvents() {
    const bairroSelect = document.getElementById('bairro-select');
    const infoSelect = document.getElementById('info-select');
    const minValueInput = document.getElementById('min-value');
    const maxValueInput = document.getElementById('max-value');
    const resetButton = document.getElementById('reset-button');

    // Eventos de mudança
    if (bairroSelect) {
        bairroSelect.addEventListener('change', function() {
            console.log(`🏘️ Bairro selecionado: "${this.value}"`);
            applyFilters();
        });
    }

    if (infoSelect) {
        infoSelect.addEventListener('change', function() {
            console.log(`📊 Campo selecionado: "${this.value}"`);
            applyFilters();
            // Atualizar cores do mapa quando mudar o campo
            if (window.updateMapColors) {
                window.updateMapColors(this.value);
            }
        });
    }

    if (minValueInput) {
        minValueInput.addEventListener('input', function() {
            console.log(`📉 Valor mínimo: ${this.value}`);
            applyFilters();
        });
    }

    if (maxValueInput) {
        maxValueInput.addEventListener('input', function() {
            console.log(`📈 Valor máximo: ${this.value}`);
            applyFilters();
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', resetAllFilters);
    }
}

// ================================
// APLICAR FILTROS - VERSÃO CORRIGIDA
// ================================
function applyFilters() {
    console.log('🔍 Aplicando filtros...');
    
    const bairroSelect = document.getElementById('bairro-select');
    const infoSelect = document.getElementById('info-select');
    const minValueInput = document.getElementById('min-value');
    const maxValueInput = document.getElementById('max-value');

    // Atualizar filtros ativos
    if (bairroSelect && infoSelect && minValueInput && maxValueInput) {
        const bairroSelecionado = bairroSelect.value;
        
        window.filtrosAtivos = {
            bairros: bairroSelecionado ? [bairroSelecionado] : [],
            info: infoSelect.value,
            minValue: minValueInput.value ? parseFloat(minValueInput.value) : null,
            maxValue: maxValueInput.value ? parseFloat(maxValueInput.value) : null
        };
        
        console.log('📋 Filtros ativos atualizados:', window.filtrosAtivos);
    }

    // Atualizar elementos do dashboard
    if (window.updateSummaryCards) {
        try {
            window.updateSummaryCards();
        } catch (error) {
            console.error('❌ Erro ao atualizar summary cards:', error);
        }
    }

    // Atualizar mapa
    if (window.filterMapPolygons) {
        try {
            window.filterMapPolygons();
        } catch (error) {
            console.error('❌ Erro ao filtrar polígonos do mapa:', error);
        }
    }

    // Log de resultados
    if (window.filtrarDados) {
        const dadosFiltrados = window.filtrarDados();
        console.log(`✅ Filtros aplicados: ${dadosFiltrados.length} itens resultantes`);
        
        if (window.filtrosAtivos.bairros.length > 0) {
            console.log(`🏘️ Filtro por bairro: ${window.filtrosAtivos.bairros[0]}`);
        }
    }
}

// ================================
// RESETAR TODOS OS FILTROS
// ================================
function resetAllFilters() {
    console.log('🔄 Resetando todos os filtros...');
    
    const bairroSelect = document.getElementById('bairro-select');
    const infoSelect = document.getElementById('info-select');
    const minValueInput = document.getElementById('min-value');
    const maxValueInput = document.getElementById('max-value');

    if (bairroSelect) {
        bairroSelect.value = '';
    }

    if (infoSelect) {
        infoSelect.value = 'capacidade_por_m2'; // Padrão
    }

    if (minValueInput) {
        minValueInput.value = '';
    }

    if (maxValueInput) {
        maxValueInput.value = '';
    }

    // Resetar filtros ativos
    window.filtrosAtivos = {
        bairros: [],
        info: 'capacidade_por_m2',
        minValue: null,
        maxValue: null
    };

    // Aplicar filtros resetados
    applyFilters();
    
    console.log('✅ Todos os filtros resetados');
}

// ================================
// OBTER ESTATÍSTICAS DOS FILTROS
// ================================
function getFilterStats() {
    if (!window.filtrarDados) {
        return {
            total: 0,
            producaoTotal: 0,
            media: 0
        };
    }
    
    const dadosFiltrados = window.filtrarDados();
    const total = dadosFiltrados.length;
    
    const producaoTotal = dadosFiltrados.reduce((sum, item) => {
        return sum + (item.properties?.capacidade_placas_mes || 0);
    }, 0);
    
    const media = total > 0 ? producaoTotal / total : 0;

    return {
        total: total,
        producaoTotal: producaoTotal,
        media: media
    };
}

// ================================
// ATUALIZAR FILTROS QUANDO DADOS MUDAREM
// ================================
function updateFiltersOnDataChange() {
    console.log('🔄 Atualizando filtros após mudança de dados...');
    
    if (window.dadosCompletos && window.dadosCompletos.length > 0) {
        populateBairroSelect();
        console.log('✅ Filtros atualizados após carregamento de dados');
    } else {
        console.warn('⚠️ Dados ainda não disponíveis para atualizar filtros');
        
        // Tentar novamente em 2 segundos
        setTimeout(() => {
            if (window.dadosCompletos && window.dadosCompletos.length > 0) {
                populateBairroSelect();
            }
        }, 2000);
    }
}

// ================================
// DIAGNÓSTICO DOS FILTROS
// ================================
function diagnosticFilters() {
    console.log('🔍 === DIAGNÓSTICO DOS FILTROS ===');
    
    // Verificar elementos HTML
    const bairroSelect = document.getElementById('bairro-select');
    const infoSelect = document.getElementById('info-select');
    const minValueInput = document.getElementById('min-value');
    const maxValueInput = document.getElementById('max-value');
    
    console.log('Elementos HTML:');
    console.log('  - bairro-select:', !!bairroSelect, bairroSelect?.options?.length || 0, 'opções');
    console.log('  - info-select:', !!infoSelect);
    console.log('  - min-value:', !!minValueInput);
    console.log('  - max-value:', !!maxValueInput);
    
    // Verificar dados
    console.log('Dados disponíveis:');
    console.log('  - dadosCompletos:', window.dadosCompletos?.length || 0);
    console.log('  - dadosExcel:', window.dadosExcel?.length || 0);
    console.log('  - filtrosAtivos:', window.filtrosAtivos);
    
    // Verificar bairros
    if (window.dadosCompletos && window.dadosCompletos.length > 0) {
        const bairros = [...new Set(
            window.dadosCompletos
                .map(item => item.properties?.bairro)
                .filter(b => b)
        )];
        console.log('Bairros nos dados completos:', bairros.length, bairros);
    }
    
    if (window.dadosExcel && window.dadosExcel.length > 0) {
        const bairrosExcel = [...new Set(
            window.dadosExcel
                .map(item => item.bairro)
                .filter(b => b)
        )];
        console.log('Bairros no Excel:', bairrosExcel.length, bairrosExcel);
    }
    
    // Verificar opções do select
    if (bairroSelect && bairroSelect.options.length > 0) {
        console.log('Opções no select de bairros:');
        for (let i = 0; i < bairroSelect.options.length; i++) {
            const option = bairroSelect.options[i];
            console.log(`  ${i}: "${option.value}" - "${option.textContent}"`);
        }
    }
}

// ================================
// FORÇAR RECARREGAMENTO DOS BAIRROS
// ================================
function forceReloadBairros() {
    console.log('🔄 Forçando recarregamento dos bairros...');
    
    // Aguardar um pouco para garantir que dados estejam carregados
    setTimeout(() => {
        populateBairroSelect();
        diagnosticFilters();
    }, 500);
}

// ================================
// VERIFICAR SE FILTROS ESTÃO FUNCIONANDO
// ================================
function testFilters() {
    console.log('🧪 === TESTE DOS FILTROS ===');
    
    if (!window.dadosCompletos || window.dadosCompletos.length === 0) {
        console.error('❌ Dados não carregados para teste');
        return;
    }
    
    // Teste 1: Filtro sem restrições
    console.log('🧪 Teste 1: Todos os dados');
    window.filtrosAtivos = {
        bairros: [],
        info: 'capacidade_por_m2',
        minValue: null,
        maxValue: null
    };
    
    const todosDados = window.filtrarDados();
    console.log(`  Resultado: ${todosDados.length} itens`);
    
    // Teste 2: Filtro por bairro (se houver mais de um)
    const bairrosUnicos = [...new Set(
        window.dadosCompletos
            .map(item => item.properties?.bairro)
            .filter(b => b)
    )];
    
    if (bairrosUnicos.length > 1) {
        console.log('🧪 Teste 2: Filtro por bairro');
        window.filtrosAtivos = {
            bairros: [bairrosUnicos[0]],
            info: 'capacidade_por_m2',
            minValue: null,
            maxValue: null
        };
        
        const dadosFiltradosPorBairro = window.filtrarDados();
        console.log(`  Bairro: ${bairrosUnicos[0]}`);
        console.log(`  Resultado: ${dadosFiltradosPorBairro.length} itens`);
    } else {
        console.log('🧪 Teste 2: Pulado (apenas 1 bairro disponível)');
    }
    
    // Teste 3: Filtro por valor
    console.log('🧪 Teste 3: Filtro por valor mínimo');
    window.filtrosAtivos = {
        bairros: [],
        info: 'capacidade_por_m2',
        minValue: 1,
        maxValue: null
    };
    
    const dadosFiltradosPorValor = window.filtrarDados();
    console.log(`  Valor mínimo: 1`);
    console.log(`  Resultado: ${dadosFiltradosPorValor.length} itens`);
    
    // Resetar filtros
    window.filtrosAtivos = {
        bairros: [],
        info: 'capacidade_por_m2',
        minValue: null,
        maxValue: null
    };
    
    console.log('✅ Teste dos filtros concluído');
}

// ================================
// POPULAR BAIRROS COM FALLBACK
// ================================
function populateBairroSelectWithFallback() {
    console.log('🔄 Populando bairros com fallback...');
    
    // Tentar dadosCompletos primeiro
    if (window.dadosCompletos && window.dadosCompletos.length > 0) {
        populateBairroSelect();
        return;
    }
    
    // Fallback para dadosExcel
    if (window.dadosExcel && window.dadosExcel.length > 0) {
        console.log('🔄 Usando fallback para dadosExcel...');
        
        const select = document.getElementById('bairro-select');
        if (!select) return;
        
        select.innerHTML = '';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Todos os bairros';
        select.appendChild(defaultOption);
        
        const bairrosExcel = [...new Set(
            window.dadosExcel
                .map(item => item.bairro)
                .filter(b => b && typeof b === 'string' && b.trim().length > 0)
                .map(b => b.trim())
        )].sort();
        
        bairrosExcel.forEach(bairro => {
            const option = document.createElement('option');
            option.value = bairro;
            option.textContent = bairro;
            select.appendChild(option);
        });
        
        console.log(`✅ ${bairrosExcel.length} bairros carregados via fallback`);
        return;
    }
    
    console.warn('⚠️ Nenhum dado disponível para bairros');
}

// ================================
// EVENTO DE CARREGAMENTO DE DADOS
// ================================
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para dados serem carregados
    setTimeout(() => {
        if (window.dadosCompletos || window.dadosExcel) {
            populateBairroSelectWithFallback();
        }
    }, 2000);
});

// ================================
// OBSERVADOR DE MUDANÇAS NOS DADOS
// ================================
function watchForDataChanges() {
    let lastDataCount = 0;
    
    const checkData = setInterval(() => {
        const currentCount = window.dadosCompletos?.length || 0;
        
        if (currentCount > 0 && currentCount !== lastDataCount) {
            console.log(`🔄 Dados mudaram: ${lastDataCount} → ${currentCount}`);
            lastDataCount = currentCount;
            populateBairroSelect();
            
            // Parar de verificar após encontrar dados
            if (currentCount > 0) {
                clearInterval(checkData);
            }
        }
    }, 1000);
    
    // Parar de verificar após 30 segundos
    setTimeout(() => {
        clearInterval(checkData);
    }, 30000);
}

// Iniciar observador
watchForDataChanges();

// ================================
// EXPORTAÇÕES GLOBAIS
// ================================
window.initializeFilters = initializeFilters;
window.applyFilters = applyFilters;
window.resetAllFilters = resetAllFilters;
window.getFilterStats = getFilterStats;
window.updateFiltersOnDataChange = updateFiltersOnDataChange;
window.populateBairroSelect = populateBairroSelect;
window.diagnosticFilters = diagnosticFilters;
window.forceReloadBairros = forceReloadBairros;
window.testFilters = testFilters;
window.populateBairroSelectWithFallback = populateBairroSelectWithFallback;

console.log('✅ FILTROS FINAIS CORRIGIDOS - Bairros funcionando!');
console.log('🔍 Execute diagnosticFilters() para diagnóstico');
console.log('🧪 Execute testFilters() para testar filtros');
console.log('🔄 Execute forceReloadBairros() se necessário');
