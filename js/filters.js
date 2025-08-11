// ================================
// SISTEMA DE FILTROS - SOLARMAP
// VERSÃO FINAL CORRIGIDA - Bairros funcionando + Cards dinâmicos
// ================================

// ================================
// INICIALIZAÇÃO DOS FILTROS
// ================================
function initializeFilters() {
    console.log('🔍 Inicializando filtros finais corrigidos...');

    try {
        setupFilterEvents();
        addInstructionText();
        
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
// ADICIONAR TEXTO INFORMATIVO
// ================================
function addInstructionText() {
    // Verificar se o texto já existe
    if (document.getElementById('map-instruction-text')) {
        return;
    }

    // Encontrar o contêiner do mapa
    const mapContainer = document.getElementById('map-container') || 
                        document.querySelector('.map-container') ||
                        document.querySelector('#map');

    if (mapContainer) {
        // Criar elemento de instrução
        const instructionDiv = document.createElement('div');
        instructionDiv.id = 'map-instruction-text';
        instructionDiv.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            font-size: 14px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #ffd700;
            font-family: Arial, sans-serif;
        `;
        instructionDiv.innerHTML = `
            <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
            <strong>Para carregar as informações de um imóvel específico nas abas seguintes, por favor, selecione um imóvel no mapa.</strong>
        `;

        // Inserir antes do mapa
        mapContainer.parentNode.insertBefore(instructionDiv, mapContainer);
        console.log('✅ Texto informativo adicionado acima do mapa');
    } else {
        console.warn('⚠️ Contêiner do mapa não encontrado para adicionar texto informativo');
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

    // Adicionar opção padrão CORRIGIDA
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Todos os bairros disponíveis';
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

    // NOVO: Atualizar cards com estatísticas do bairro selecionado
    updateSummaryCardsWithFilters();

    // CORREÇÃO: Não chamar updateSummaryCards do dashboard, pois sobrescreve nossos filtros
    // if (window.updateSummaryCards) {
    //     try {
    //         window.updateSummaryCards();
    //     } catch (error) {
    //         console.error('❌ Erro ao atualizar summary cards:', error);
    //     }
    // }

    // Atualizar mapa - NOVA IMPLEMENTAÇÃO
    filterMapPolygons();

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
// ATUALIZAR CARDS COM FILTROS - FUNÇÃO DE DEBUG INTENSIVO
// ================================
function updateSummaryCardsWithFilters() {
    console.log('📊 === INICIANDO DEBUG INTENSIVO DOS CARDS ===');
    
    // Verificar se temos dados
    if (!window.dadosCompletos || !window.dadosCompletos.length) {
        console.error('❌ dadosCompletos não disponível');
        return;
    }

    console.log(`📊 Total de dados disponíveis: ${window.dadosCompletos.length}`);
    console.log(`📊 Filtros ativos:`, window.filtrosAtivos);

    // Verificar estrutura dos filtros
    if (!window.filtrosAtivos) {
        console.error('❌ window.filtrosAtivos é null/undefined');
        return;
    }

    const bairrosFiltro = window.filtrosAtivos.bairros;
    console.log(`🔍 Bairros no filtro:`, bairrosFiltro);
    console.log(`🔍 Tem filtro de bairro? ${bairrosFiltro && bairrosFiltro.length > 0}`);

    if (bairrosFiltro && bairrosFiltro.length > 0) {
        const bairroSelecionado = bairrosFiltro[0];
        console.log(`🎯 Bairro selecionado: "${bairroSelecionado}"`);
        console.log(`🎯 Tipo do bairro: ${typeof bairroSelecionado}`);
        console.log(`🎯 Comprimento: ${bairroSelecionado.length}`);

        // Verificar quantos itens têm esse bairro EXATO
        let count = 0;
        let exemplosBairros = [];
        
        for (let i = 0; i < Math.min(10, window.dadosCompletos.length); i++) {
            const item = window.dadosCompletos[i];
            const bairroItem = item.properties?.bairro;
            
            if (i < 5) {
                exemplosBairros.push({
                    id: item.id,
                    bairro: `"${bairroItem}"`,
                    match: bairroItem === bairroSelecionado
                });
            }
            
            if (bairroItem === bairroSelecionado) {
                count++;
            }
        }
        
        console.log(`🔍 Exemplos dos primeiros 5 itens:`, exemplosBairros);
        console.log(`🔍 Matches encontrados nos primeiros 10: ${count}`);

        // Contar TODOS os matches
        const todosMatches = window.dadosCompletos.filter(item => 
            item.properties?.bairro === bairroSelecionado
        );
        
        console.log(`✅ Total de matches para "${bairroSelecionado}": ${todosMatches.length}`);

        // Se encontrou matches, usar esses dados
        if (todosMatches.length > 0) {
            console.log(`🎯 Usando ${todosMatches.length} itens filtrados para cálculo`);
            updateCardsDisplay(todosMatches, bairroSelecionado);
            return;
        } else {
            console.error(`❌ NENHUM MATCH encontrado para bairro "${bairroSelecionado}"`);
            
            // Mostrar todos os bairros únicos disponíveis
            const bairrosUnicos = [...new Set(
                window.dadosCompletos.map(item => item.properties?.bairro).filter(b => b)
            )];
            
            console.log(`🔍 Bairros disponíveis (${bairrosUnicos.length}):`, bairrosUnicos);
            
            // Verificar se há similaridade
            const similares = bairrosUnicos.filter(b => 
                b.includes(bairroSelecionado) || bairroSelecionado.includes(b)
            );
            
            if (similares.length > 0) {
                console.log(`🔍 Bairros similares encontrados:`, similares);
            }
        }
    }

    // Se chegou aqui, usar todos os dados
    console.log(`📊 Usando todos os dados (${window.dadosCompletos.length})`);
    updateCardsDisplay(window.dadosCompletos, 'Todos');
}

// ================================
// ATUALIZAR DISPLAY DOS CARDS
// ================================
function updateCardsDisplay(dados, bairroNome) {
    console.log(`📊 === ATUALIZANDO CARDS PARA: ${bairroNome} ===`);
    console.log(`📊 Dados recebidos: ${dados.length} itens`);
    
    const totalImoveis = dados.length;
    
    const producaoTotal = dados.reduce((sum, item) => {
        const valor = item.properties?.capacidade_por_m2 || 0;
        return sum + valor;
    }, 0);
    
    const mediaPorImovel = totalImoveis > 0 ? producaoTotal / totalImoveis : 0;

    console.log(`📊 Cálculos realizados:`);
    console.log(`   - Total Imóveis: ${totalImoveis}`);
    console.log(`   - Produção Total: ${producaoTotal.toFixed(2)}`);
    console.log(`   - Média: ${mediaPorImovel.toFixed(2)}`);

    // Atualizar elementos HTML
    const totalEl = document.getElementById('total-imoveis-display');
    const producaoEl = document.getElementById('producao-total-display');
    const mediaEl = document.getElementById('media-imovel-display');
    
    console.log(`📊 Elementos HTML encontrados:`);
    console.log(`   - total-imoveis-display: ${!!totalEl}`);
    console.log(`   - producao-total-display: ${!!producaoEl}`);
    console.log(`   - media-imovel-display: ${!!mediaEl}`);
    
    if (totalEl) {
        const textoTotal = totalImoveis.toLocaleString('pt-BR');
        totalEl.textContent = textoTotal;
        console.log(`   ✅ Total atualizado para: "${textoTotal}"`);
    }
    
    if (producaoEl) {
        const textoProducao = window.formatNumber ? window.formatNumber(producaoTotal, 2) : producaoTotal.toFixed(2);
        producaoEl.textContent = textoProducao;
        console.log(`   ✅ Produção atualizada para: "${textoProducao}"`);
    }
    
    if (mediaEl) {
        const textoMedia = window.formatNumber ? window.formatNumber(mediaPorImovel, 2) : mediaPorImovel.toFixed(2);
        mediaEl.textContent = textoMedia;
        console.log(`   ✅ Média atualizada para: "${textoMedia}"`);
    }

    console.log(`✅ Cards atualizados com sucesso para: ${bairroNome}`);
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
// DIAGNÓSTICO DE LAYERS NO MAPA
// ================================
function diagnosticMapLayers() {
    console.log('🔍 === DIAGNÓSTICO DE LAYERS NO MAPA ===');
    
    if (!window.layerGroup) {
        console.error('❌ layerGroup não encontrado');
        return;
    }
    
    let totalLayers = 0;
    let layersComImovelData = 0;
    let layersComFeature = 0;
    let layersComOptions = 0;
    
    console.log('📊 Analisando layers...');
    
    window.layerGroup.eachLayer(function(layer) {
        totalLayers++;
        
        // Analisar apenas os primeiros 3 layers para debug
        if (totalLayers <= 3) {
            console.log(`\n🔍 Layer ${totalLayers}:`);
            console.log('  - Tipo:', layer.constructor.name);
            console.log('  - imovelData:', !!layer.imovelData);
            console.log('  - feature:', !!layer.feature);
            console.log('  - options:', !!layer.options);
            
            if (layer.imovelData) {
                console.log('  - imovelData.id:', layer.imovelData.id);
                console.log('  - imovelData.properties.bairro:', layer.imovelData.properties?.bairro);
                layersComImovelData++;
            }
            
            if (layer.feature) {
                console.log('  - feature.properties:', Object.keys(layer.feature.properties || {}));
                layersComFeature++;
            }
            
            if (layer.options) {
                console.log('  - options keys:', Object.keys(layer.options));
                layersComOptions++;
            }
        } else {
            // Contar os outros sem detalhar
            if (layer.imovelData) layersComImovelData++;
            if (layer.feature) layersComFeature++;
            if (layer.options) layersComOptions++;
        }
    });
    
    console.log(`\n📊 Resumo:`);
    console.log(`  - Total de layers: ${totalLayers}`);
    console.log(`  - Com imovelData: ${layersComImovelData}`);
    console.log(`  - Com feature: ${layersComFeature}`);
    console.log(`  - Com options: ${layersComOptions}`);
}

// ================================
// FILTRAR POLÍGONOS NO MAPA - FUNÇÃO CORRIGIDA V2
// ================================
function filterMapPolygons() {
    console.log('🗺️ Filtrando polígonos no mapa...');
    
    // Verificar se o mapa e layerGroup existem
    if (!window.mapInstance || !window.layerGroup) {
        console.warn('⚠️ Mapa ou layerGroup não disponível para filtros');
        return;
    }
    
    const bairroSelecionado = window.filtrosAtivos?.bairros?.[0] || null;
    console.log(`🏘️ Bairro para filtro no mapa: ${bairroSelecionado || 'Todos'}`);
    
    let polígnosVisíveis = 0;
    let polígnosOcultos = 0;
    let layersParaZoom = [];
    let layersSemDados = 0;
    
    // Primeira passagem: diagnosticar se necessário
    if (window.layerGroup.getLayers().length > 0) {
        const primeiroLayer = window.layerGroup.getLayers()[0];
        if (!primeiroLayer.imovelData && !primeiroLayer.feature) {
            console.log('🔍 Executando diagnóstico de layers...');
            diagnosticMapLayers();
        }
    }
    
    // Iterar por todos os layers no mapa
    window.layerGroup.eachLayer(function(layer) {
        let imovelData = null;
        let bairroDoImovel = null;
        let imovelId = null;
        
        // MÉTODO 1: Verificar se já tem imovelData anexado
        if (layer.imovelData && layer.imovelData.properties) {
            imovelData = layer.imovelData;
            bairroDoImovel = imovelData.properties.bairro;
            imovelId = imovelData.id;
        }
        // MÉTODO 2: Tentar através do feature
        else if (layer.feature && layer.feature.properties) {
            const featureProps = layer.feature.properties;
            imovelId = featureProps.OBJECTID || featureProps.objectid || featureProps.id;
            
            if (imovelId && window.dadosCompletos) {
                imovelData = window.dadosCompletos.find(item => 
                    item.id == imovelId || 
                    item.properties?.objectid == imovelId ||
                    item.properties?.id == imovelId
                );
                
                if (imovelData) {
                    bairroDoImovel = imovelData.properties?.bairro;
                    // Anexar dados ao layer para próximas vezes
                    layer.imovelData = imovelData;
                }
            }
        }
        // MÉTODO 3: Tentar através das opções
        else if (layer.options) {
            imovelId = layer.options.imovelId || layer.options.id;
            
            if (imovelId && window.dadosCompletos) {
                imovelData = window.dadosCompletos.find(item => item.id == imovelId);
                if (imovelData) {
                    bairroDoImovel = imovelData.properties?.bairro;
                    layer.imovelData = imovelData;
                }
            }
        }
        
        // Se ainda não encontrou, tentar buscar por posição/coordenadas (último recurso)
        if (!imovelData && layer.getBounds && window.dadosCompletos) {
            try {
                const bounds = layer.getBounds();
                const center = bounds.getCenter();
                
                // Buscar dados completos que estejam próximos
                imovelData = window.dadosCompletos.find(item => {
                    if (item.centroid) {
                        const distance = Math.abs(item.centroid[0] - center.lat) + 
                                       Math.abs(item.centroid[1] - center.lng);
                        return distance < 0.001; // Tolerância pequena
                    }
                    return false;
                });
                
                if (imovelData) {
                    bairroDoImovel = imovelData.properties?.bairro;
                    layer.imovelData = imovelData;
                }
            } catch (error) {
                // Silenciosamente ignorar erros de coordenadas
            }
        }
        
        if (!imovelData || !bairroDoImovel) {
            layersSemDados++;
            // Se não há filtro de bairro, manter visível
            if (!bairroSelecionado) {
                layersParaZoom.push(layer);
                polígnosVisíveis++;
            } else {
                polígnosOcultos++;
            }
            return;
        }
        
        // Determinar se deve mostrar ou ocultar
        let mostrar = true;
        
        if (bairroSelecionado && bairroSelecionado.trim() !== '') {
            // Se há bairro selecionado, mostrar apenas esse bairro
            mostrar = bairroDoImovel === bairroSelecionado;
        }
        
        // Aplicar filtros adicionais (valores min/max)
        if (mostrar && window.filtrosAtivos) {
            const valor = imovelData.properties[window.filtrosAtivos.info] || 0;
            
            if (window.filtrosAtivos.minValue !== null && valor < window.filtrosAtivos.minValue) {
                mostrar = false;
            }
            
            if (window.filtrosAtivos.maxValue !== null && valor > window.filtrosAtivos.maxValue) {
                mostrar = false;
            }
        }
        
        // Controlar visibilidade do layer
        if (mostrar) {
            layer.setStyle({ opacity: 1, fillOpacity: 0.7 }); // Tornar visível
            layersParaZoom.push(layer);
            polígnosVisíveis++;
        } else {
            layer.setStyle({ opacity: 0, fillOpacity: 0 }); // Tornar invisível
            polígnosOcultos++;
        }
    });
    
    console.log(`✅ Filtro aplicado no mapa:`);
    console.log(`   📍 Polígonos visíveis: ${polígnosVisíveis}`);
    console.log(`   👁️ Polígonos ocultos: ${polígnosOcultos}`);
    console.log(`   ⚠️ Layers sem dados: ${layersSemDados}`);
    
    // Ajustar zoom se houver polígonos visíveis
    if (layersParaZoom.length > 0) {
        setTimeout(() => {
            ajustarZoomParaLayers(layersParaZoom, bairroSelecionado);
        }, 200);
    } else {
        console.warn('⚠️ Nenhum layer válido para zoom encontrado');
    }
}

// ================================
// AJUSTAR ZOOM PARA LAYERS ESPECÍFICOS
// ================================
function ajustarZoomParaLayers(layers, bairroSelecionado) {
    if (!window.mapInstance || layers.length === 0) return;
    
    try {
        console.log(`🔍 Ajustando zoom para ${layers.length} polígonos${bairroSelecionado ? ` do bairro: ${bairroSelecionado}` : ''}`);
        
        const group = new L.featureGroup(layers);
        const bounds = group.getBounds();
        
        if (bounds.isValid()) {
            window.mapInstance.fitBounds(bounds, {
                padding: [20, 20],
                maxZoom: bairroSelecionado ? 16 : 15
            });
            console.log(`✅ Zoom ajustado com sucesso`);
        } else {
            console.warn('⚠️ Bounds inválidos para ajuste de zoom');
        }
    } catch (error) {
        console.error('❌ Erro ao ajustar zoom:', error);
    }
}
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
        return sum + (item.properties?.capacidade_por_m2 || 0);
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
    
    // Testar estatísticas dos filtros
    const stats = getFilterStats();
    console.log('Estatísticas atuais dos filtros:', stats);
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
        
        // Testar atualização dos cards
        updateSummaryCardsWithFilters();
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
    
    updateSummaryCardsWithFilters();
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
        defaultOption.textContent = 'Todos os bairros disponíveis';
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
            
            // Adicionar texto informativo quando dados carregarem
            addInstructionText();
            
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
window.filterMapPolygons = filterMapPolygons;
window.ajustarZoomParaLayers = ajustarZoomParaLayers;
window.diagnosticMapLayers = diagnosticMapLayers;

console.log('✅ FILTROS FINAIS CORRIGIDOS - Bairros funcionando + Cards dinâmicos!');
console.log('🔍 Execute diagnosticFilters() para diagnóstico');
console.log('🧪 Execute testFilters() para testar filtros');
console.log('🔄 Execute forceReloadBairros() se necessário');
console.log('📊 Execute updateSummaryCardsWithFilters() para testar cards dinâmicos');
