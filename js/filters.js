// ================================
// SISTEMA DE FILTROS - SOLARMAP
// VERSÃO CORRIGIDA COM APENAS 2 OPÇÕES
// ================================

// ================================
// INICIALIZAÇÃO DOS FILTROS
// ================================
function initializeFilters() {
    console.log('🔍 Inicializando filtros corrigidos...');

    try {
        populateBairroSelect();
        setupFilterEvents();
        console.log('✅ Filtros inicializados com sucesso');
    } catch (error) {
        console.error('❌ Erro ao inicializar filtros:', error);
        throw error;
    }
}

// ================================
// POPULAR SELECT DE BAIRROS
// ================================
function populateBairroSelect() {
    const select = document.getElementById('bairro-select');
    if (!select) {
        console.error('❌ Select de bairros não encontrado');
        return;
    }

    // Limpar opções existentes
    select.innerHTML = '';

    // Obter bairros únicos dos dados
    const bairros = [...new Set(window.dadosCompletos.map(item => item.properties.bairro))].sort();

    // Adicionar opção padrão
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Todos os Bairros';
    select.appendChild(defaultOption);

    // Adicionar opções de bairros
    bairros.forEach(bairro => {
        const option = document.createElement('option');
        option.value = bairro;
        option.textContent = bairro;
        select.appendChild(option);
    });

    console.log(`✅ ${bairros.length} bairros carregados no filtro`);
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
        bairroSelect.addEventListener('change', applyFilters);
    }

    if (infoSelect) {
        infoSelect.addEventListener('change', function() {
            applyFilters();
            // Atualizar cores do mapa quando mudar o campo
            if (window.updateMapColors) {
                window.updateMapColors(this.value);
            }
        });
    }

    if (minValueInput) {
        minValueInput.addEventListener('input', applyFilters);
    }

    if (maxValueInput) {
        maxValueInput.addEventListener('input', applyFilters);
    }

    if (resetButton) {
        resetButton.addEventListener('click', resetAllFilters);
    }
}

// ================================
// APLICAR FILTROS
// ================================
function applyFilters() {
    console.log('🔍 Aplicando filtros...');
    
    const bairroSelect = document.getElementById('bairro-select');
    const infoSelect = document.getElementById('info-select');
    const minValueInput = document.getElementById('min-value');
    const maxValueInput = document.getElementById('max-value');

    // Atualizar filtros ativos
    if (bairroSelect && infoSelect && minValueInput && maxValueInput) {
        window.filtrosAtivos.bairros = bairroSelect.value ? [bairroSelect.value] : [];
        window.filtrosAtivos.info = infoSelect.value;
        window.filtrosAtivos.minValue = minValueInput.value ? parseFloat(minValueInput.value) : null;
        window.filtrosAtivos.maxValue = maxValueInput.value ? parseFloat(maxValueInput.value) : null;
    }

    // Atualizar elementos do dashboard
    if (window.updateSummaryCards) {
        window.updateSummaryCards();
    }

    // Atualizar cores e filtros no mapa
    if (window.updateMapColors) {
        window.updateMapColors(window.filtrosAtivos.info);
    }

    if (window.filterMapPolygons) {
        window.filterMapPolygons();
    }

    console.log('✅ Filtros aplicados:', window.filtrosAtivos);
}

// ================================
// RESETAR TODOS OS FILTROS
// ================================
function resetAllFilters() {
    console.log('🔄 Resetando filtros...');
    
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
    
    console.log('✅ Filtros resetados');
}

// ================================
// OBTER ESTATÍSTICAS DOS FILTROS
// ================================
function getFilterStats() {
    const dadosFiltrados = window.filtrarDados();
    const total = dadosFiltrados.length;
    
    // CORRIGIDO: Usar capacidade_placas_mes
    const producaoTotal = dadosFiltrados.reduce((sum, item) => sum + (item.properties.capacidade_placas_mes || 0), 0);
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
    if (window.dadosCompletos && window.dadosCompletos.length > 0) {
        populateBairroSelect();
        console.log('🔄 Filtros atualizados após carregamento de dados');
    }
}

// ================================
// EXPORTAÇÕES GLOBAIS
// ================================
window.initializeFilters = initializeFilters;
window.applyFilters = applyFilters;
window.resetAllFilters = resetAllFilters;
window.getFilterStats = getFilterStats;
window.updateFiltersOnDataChange = updateFiltersOnDataChange;
window.populateBairroSelect = populateBairroSelect;

console.log('✅ FILTROS CORRIGIDOS - Apenas 2 opções implementadas!');