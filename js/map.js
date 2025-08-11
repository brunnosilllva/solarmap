// ================================
// MAPA INTERATIVO - SOLARMAP
// VERSÃO MELHORADA COM PALETA DE CORES RICA
// ================================

// Variáveis globais do mapa
let mapInstance;
let layerGroup;
let selectedPolygon = null;
let legendControl = null;
let allPolygons = [];

// ================================
// PALETAS DE CORES MELHORADAS
// ================================

// PALETA PRINCIPAL: Azul → Cinza → Laranja → Vermelho (7 cores)
const GRADIENT_COLORS_RICH = [
    '#2166ac',  // Azul escuro (valores muito baixos)
    '#4393c3',  // Azul médio 
    '#92c5de',  // Azul claro
    '#f7f7f7',  // Cinza claro (valores médios)
    '#fdbf6f',  // Laranja claro
    '#ff7f00',  // Laranja
    '#d73027'   // Vermelho (valores altos)
];

// PALETA ALTERNATIVA: Verde → Amarelo → Vermelho (capacidade solar)
const GRADIENT_COLORS_SOLAR = [
    '#1a9850',  // Verde escuro (baixa capacidade)
    '#66bd63',  // Verde médio
    '#a6d96a',  // Verde claro
    '#d9ef8b',  // Verde amarelado
    '#fee08b',  // Amarelo claro
    '#fdae61',  // Laranja claro
    '#f46d43',  // Laranja
    '#d73027'   // Vermelho (alta capacidade)
];

// PALETA VIBRANTE: Para alta visibilidade
const GRADIENT_COLORS_VIBRANT = [
    '#313695',  // Azul muito escuro
    '#4575b4',  // Azul escuro
    '#74add1',  // Azul médio
    '#abd9e9',  // Azul claro
    '#fee090',  // Amarelo claro
    '#fdae61',  // Laranja claro
    '#f46d43',  // Laranja
    '#d73027',  // Vermelho
    '#a50026'   // Vermelho escuro
];

// Paleta ativa (pode ser alterada dinamicamente)
let ACTIVE_GRADIENT = GRADIENT_COLORS_RICH;

// ================================
// FUNÇÃO DE FORMATAÇÃO
// ================================
function formatNumberWithDots(numero, decimais = 2) {
    if (numero === null || numero === undefined || isNaN(numero)) {
        return '0,00';
    }
    
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais
    }).format(numero);
}

// ================================
// SELETOR DE PALETA DE CORES
// ================================
function changePalette(paletteType = 'rich') {
    console.log(`🎨 Alterando paleta para: ${paletteType}`);
    
    switch(paletteType) {
        case 'rich':
            ACTIVE_GRADIENT = GRADIENT_COLORS_RICH;
            break;
        case 'solar':
            ACTIVE_GRADIENT = GRADIENT_COLORS_SOLAR;
            break;
        case 'vibrant':
            ACTIVE_GRADIENT = GRADIENT_COLORS_VIBRANT;
            break;
        default:
            ACTIVE_GRADIENT = GRADIENT_COLORS_RICH;
    }
    
    // Reaplicar cores nos polígonos existentes
    if (layerGroup && layerGroup.getLayers().length > 0) {
        addPolygonsToMap();
    }
    
    console.log(`✅ Paleta alterada para ${paletteType} (${ACTIVE_GRADIENT.length} cores)`);
}

// ================================
// INICIALIZAÇÃO DO MAPA
// ================================
function initMap() {
    console.log('🗺️ Inicializando mapa corrigido...');
    
    try {
        // Criar mapa centrado em São Luís
        mapInstance = L.map('map').setView([-2.53, -44.30], 11);

        // Adicionar tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(mapInstance);

        // Criar grupo de camadas para os polígonos
        layerGroup = L.layerGroup().addTo(mapInstance);

        console.log('✅ Mapa inicializado com sucesso');
        
        // Exportar globalmente
        window.mapInstance = mapInstance;
        window.layerGroup = layerGroup;
        
        // Adicionar controle de paletas
        addPaletteControl();
        
    } catch (error) {
        console.error('❌ Erro ao inicializar mapa:', error);
        throw error;
    }
}

// ================================
// CONTROLE DE PALETAS NO MAPA
// ================================
function addPaletteControl() {
    const paletteControl = L.control({ position: 'topleft' });
    
    paletteControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'palette-control');
        div.style.cssText = `
            background: white;
            padding: 10px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            font-size: 12px;
        `;
        
        div.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold; color: #333;">🎨 Paleta de Cores:</div>
            <button onclick="changePalette('rich')" style="margin: 2px; padding: 4px 8px; font-size: 11px; border: 1px solid #ccc; background: white; cursor: pointer; border-radius: 3px;">Rica</button>
            <button onclick="changePalette('solar')" style="margin: 2px; padding: 4px 8px; font-size: 11px; border: 1px solid #ccc; background: white; cursor: pointer; border-radius: 3px;">Solar</button>
            <button onclick="changePalette('vibrant')" style="margin: 2px; padding: 4px 8px; font-size: 11px; border: 1px solid #ccc; background: white; cursor: pointer; border-radius: 3px;">Vibrante</button>
        `;
        
        // Prevenir propagação de eventos do mapa
        L.DomEvent.disableClickPropagation(div);
        
        return div;
    };
    
    paletteControl.addTo(mapInstance);
}

// ================================
// FUNÇÃO AUXILIAR PARA CONVERTER HEX PARA RGB
// ================================
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// ================================
// INTERPOLAÇÃO DE CORES MELHORADA
// ================================
function interpolateColors(color1, color2, factor) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) {
        return color1;
    }
    
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
}

// ================================
// FUNÇÃO MELHORADA PARA OBTER COR DO GRADIENTE
// ================================
function getGradientColor(valor, minValue, maxValue) {
    if (maxValue === minValue) {
        return ACTIVE_GRADIENT[Math.floor(ACTIVE_GRADIENT.length / 2)];
    }
    
    // Normalizar valor entre 0 e 1
    const normalized = Math.max(0, Math.min(1, (valor - minValue) / (maxValue - minValue)));
    
    // Calcular índice na paleta
    const index = normalized * (ACTIVE_GRADIENT.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    
    // Se índices são iguais, retornar cor direta
    if (lowerIndex === upperIndex) {
        return ACTIVE_GRADIENT[lowerIndex];
    }
    
    // Interpolação suave entre duas cores
    const factor = index - lowerIndex;
    const lowerColor = ACTIVE_GRADIENT[lowerIndex];
    const upperColor = ACTIVE_GRADIENT[upperIndex];
    
    return interpolateColors(lowerColor, upperColor, factor);
}

// ================================
// CRIAR LEGENDA MELHORADA COM MAIS DIVISÕES
// ================================
function createMapLegend(currentField, minValue, maxValue) {
    // Remover legenda anterior se existir
    if (legendControl) {
        mapInstance.removeControl(legendControl);
    }
    
    // Títulos dos campos conforme especificação
    const fieldTitles = {
        'capacidade_por_m2': 'Capacidade por m² (kW)',
        'producao_telhado': 'Produção do Telhado (kW)',
        'area_edificacao': 'Área da Edificação (m²)',
        'radiacao_max': 'Radiação Máxima (kW/m²)',
        'quantidade_placas': 'Quantidade de Placas',
        'renda_total': 'Renda Total (R$)'
    };
    
    const title = fieldTitles[currentField] || currentField.replace('_', ' ');
    
    // Criar controle de legenda
    legendControl = L.control({ position: 'topright' });
    
    legendControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'legend');
        div.style.cssText = `
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            min-width: 200px;
            max-width: 250px;
        `;
        
        // Título da legenda
        div.innerHTML = `<h4 style="margin: 0 0 12px 0; color: #1e3a5f; font-size: 14px; font-weight: bold;">${title}</h4>`;
        
        // Criar gradiente CSS
        const gradientStops = ACTIVE_GRADIENT.map((color, index) => {
            const percentage = (index / (ACTIVE_GRADIENT.length - 1)) * 100;
            return `${color} ${percentage}%`;
        }).join(', ');
        
        // Container do gradiente
        div.innerHTML += `
            <div style="
                height: 25px;
                background: linear-gradient(to right, ${gradientStops});
                border: 1px solid #ccc;
                border-radius: 4px;
                margin-bottom: 10px;
            "></div>
        `;
        
        // Labels de valores com mais divisões
        const range = maxValue - minValue;
        const step = range / (ACTIVE_GRADIENT.length - 1);
        
        let labelsHtml = '<div style="display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-bottom: 8px;">';
        
        for (let i = 0; i < ACTIVE_GRADIENT.length; i++) {
            const value = minValue + (step * i);
            const formattedValue = window.formatNumber ? 
                window.formatNumber(value, 1) : 
                value.toFixed(1);
            
            labelsHtml += `<span style="text-align: center; flex: 1;">${formattedValue}</span>`;
        }
        
        labelsHtml += '</div>';
        div.innerHTML += labelsHtml;
        
        // Informações adicionais
        const dadosFiltrados = window.filtrarDados ? window.filtrarDados() : [];
        const totalVisible = dadosFiltrados.length;
        
        div.innerHTML += `
            <div style="
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px solid #eee;
                font-size: 11px;
                color: #666;
            ">
                <div style="margin-bottom: 4px;">
                    <strong>📊 Dados:</strong> ${formatNumberWithDots(totalVisible, 0)} imóveis
                </div>
                <div style="margin-bottom: 4px;">
                    <strong>📈 Variação:</strong> ${window.formatNumber ? window.formatNumber(range, 2) : range.toFixed(2)}
                </div>
                <div style="color: #888; font-size: 10px;">
                    🎨 Paleta: ${ACTIVE_GRADIENT.length} cores
                </div>
            </div>
        `;
        
        return div;
    };
    
    legendControl.addTo(mapInstance);
    console.log(`🎨 Legenda criada para ${title} com ${ACTIVE_GRADIENT.length} cores`);
}

// ================================
// CALCULAR BOUNDS DE UM CONJUNTO DE DADOS
// ================================
function calculateBounds(dados) {
    if (!dados || dados.length === 0) return null;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    dados.forEach(item => {
        if (item.centroid && item.centroid.length >= 2) {
            const lat = item.centroid[0];
            const lng = item.centroid[1];
            
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
        }
    });
    
    if (minLat === Infinity) return null;
    
    return [
        [minLat, minLng],
        [maxLat, maxLng]
    ];
}

// ================================
// AUTO-ZOOM PARA BAIRRO SELECIONADO
// ================================
function autoZoomToBairro(bairroSelecionado) {
    if (!bairroSelecionado || !window.dadosCompletos) {
        // Se não há bairro selecionado, mostrar todos os dados
        const dadosFiltrados = window.filtrarDados();
        if (dadosFiltrados.length > 0) {
            const bounds = calculateBounds(dadosFiltrados);
            if (bounds) {
                mapInstance.fitBounds(bounds, { padding: [20, 20] });
                console.log('🎯 Zoom ajustado para mostrar todos os dados filtrados');
            }
        }
        return;
    }
    
    // Filtrar imóveis do bairro selecionado
    const imoveisDoBairro = window.dadosCompletos.filter(item => 
        item.properties.bairro === bairroSelecionado
    );
    
    if (imoveisDoBairro.length === 0) {
        console.warn(`⚠️ Nenhum imóvel encontrado no bairro: ${bairroSelecionado}`);
        return;
    }
    
    // Calcular bounds do bairro
    const bounds = calculateBounds(imoveisDoBairro);
    if (bounds) {
        mapInstance.fitBounds(bounds, { 
            padding: [30, 30],
            maxZoom: 14
        });
        console.log(`🎯 Zoom automático para bairro: ${bairroSelecionado} (${imoveisDoBairro.length} imóveis)`);
    }
}

// ================================
// ADICIONAR POLÍGONOS AO MAPA - VERSÃO MELHORADA
// ================================
function addPolygonsToMap() {
    console.log('📍 === ADICIONANDO POLÍGONOS (VERSÃO MELHORADA) ===');
    
    if (!window.dadosCompletos || window.dadosCompletos.length === 0) {
        console.error('❌ dadosCompletos não disponível');
        return;
    }

    if (!layerGroup) {
        console.error('❌ layerGroup não inicializado');
        return;
    }

    // Limpar polígonos existentes
    layerGroup.clearLayers();
    allPolygons = [];

    const currentField = window.filtrosAtivos?.info || 'capacidade_por_m2';
    
    // Obter dados filtrados
    const dadosFiltrados = window.filtrarDados ? window.filtrarDados() : window.dadosCompletos;
    
    console.log(`📊 Total de dados: ${window.dadosCompletos.length}`);
    console.log(`📊 Dados após filtros: ${dadosFiltrados.length}`);
    console.log(`🎨 Paleta ativa: ${ACTIVE_GRADIENT.length} cores`);
    
    if (dadosFiltrados.length === 0) {
        console.warn('⚠️ Nenhum dado após aplicar filtros');
        return;
    }
    
    // Verificar dados válidos para o mapa
    const dadosValidosParaMapa = dadosFiltrados.filter(item => {
        return item && 
               item.coordinates && 
               item.coordinates.length > 0 && 
               item.centroid && 
               item.centroid.length === 2 &&
               item.centroid[0] >= -3 && item.centroid[0] <= -2 &&
               item.centroid[1] >= -45 && item.centroid[1] <= -43;
    });
    
    console.log(`📍 Dados válidos para mapa: ${dadosValidosParaMapa.length}`);
    
    if (dadosValidosParaMapa.length === 0) {
        console.error('❌ Nenhum dado válido para o mapa!');
        return;
    }
    
    // Calcular min/max para cores (APENAS valores > 0)
    const values = dadosValidosParaMapa
        .map(item => item.properties?.[currentField] || 0)
        .filter(val => val > 0);
    
    let minValue, maxValue;
    
    if (values.length === 0) {
        console.warn('⚠️ Nenhum valor válido para coloração, usando valores padrão');
        minValue = 0;
        maxValue = 1;
    } else {
        minValue = Math.min(...values);
        maxValue = Math.max(...values);
        
        // Adicionar pequena margem para melhor distribuição
        const range = maxValue - minValue;
        const margin = range * 0.05; // 5% de margem
        minValue = Math.max(0, minValue - margin);
        maxValue = maxValue + margin;
    }

    console.log(`🎨 Coloração por: ${currentField}`);
    console.log(`📊 Valores: ${minValue.toFixed(2)} - ${maxValue.toFixed(2)}`);
    console.log(`📍 Processando ${dadosValidosParaMapa.length} polígonos válidos`);

    let sucessos = 0;
    let erros = 0;

    // Processar cada item válido
    dadosValidosParaMapa.forEach((item, index) => {
        try {
            // Calcular cor com nova paleta
            const fieldValue = item.properties?.[currentField] || 0;
            const color = getGradientColor(fieldValue, minValue, maxValue);

            // Criar polígono com estilo melhorado
            const polygon = L.polygon(item.coordinates, {
                color: '#ffffff',
                weight: 0.5,
                opacity: 0.8,
                fillColor: color,
                fillOpacity: 0.8
            });

            // Dados do polígono
            polygon.itemId = item.id;
            polygon.itemData = item;

            // POPUP MELHORADO
            const popupContent = createPopupContentFixed(item);
            polygon.bindPopup(popupContent);

            // Eventos do polígono com transições suaves
            polygon.on('click', function(e) {
                selectPolygon(item.id, polygon);
            });

            polygon.on('mouseover', function(e) {
                this.setStyle({
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.95,
                    color: '#000000'
                });
            });

            polygon.on('mouseout', function(e) {
                if (selectedPolygon !== polygon) {
                    this.setStyle({
                        weight: 0.5,
                        opacity: 0.8,
                        fillOpacity: 0.8,
                        color: '#ffffff'
                    });
                }
            });

            // Adicionar ao mapa
            layerGroup.addLayer(polygon);
            allPolygons.push(polygon);
            sucessos++;

            // Debug dos primeiros 3 polígonos
            if (index < 3) {
                console.log(`✅ Polígono ${item.id} adicionado:`);
                console.log(`   Bairro: ${item.properties?.bairro}`);
                console.log(`   Valor ${currentField}: ${fieldValue}`);
                console.log(`   Cor: ${color}`);
            }

        } catch (error) {
            console.error(`❌ Erro ao processar polígono ${item?.id}:`, error);
            erros++;
        }
    });

    console.log('📊 === RESULTADO FINAL MAPA ===');
    console.log(`✅ Polígonos adicionados com sucesso: ${sucessos}`);
    console.log(`❌ Erros encontrados: ${erros}`);
    console.log(`📍 Total de layers no mapa: ${layerGroup.getLayers().length}`);
    console.log(`🎨 Paleta usada: ${ACTIVE_GRADIENT.length} cores`);

    // Ajustar zoom se há polígonos
    if (sucessos > 0) {
        try {
            // CORREÇÃO: Usar featureGroup para getBounds
            const featureGroup = new L.FeatureGroup(layerGroup.getLayers());
            const bounds = featureGroup.getBounds();
            if (bounds.isValid()) {
                mapInstance.fitBounds(bounds, { padding: [20, 20] });
                console.log('✅ Zoom ajustado automaticamente');
            }
        } catch (error) {
            console.warn('⚠️ Erro ao ajustar zoom:', error);
        }
    }

    // Criar legenda melhorada se há polígonos
    if (sucessos > 0 && values.length > 0) {
        try {
            createMapLegend(currentField, minValue, maxValue);
        } catch (error) {
            console.warn('⚠️ Erro ao criar legenda:', error);
        }
    }

    // Auto-zoom baseado no bairro selecionado
    const bairroSelecionado = window.filtrosAtivos?.bairros?.[0];
    if (bairroSelecionado) {
        autoZoomToBairro(bairroSelecionado);
    }
}

// ================================
// CRIAR CONTEÚDO DO POPUP - MELHORADO
// ================================
function createPopupContentFixed(item) {
    const props = item.properties;
    
    // POPUP MELHORADO com mais informações
    return `
        <div style="min-width: 300px; font-family: Arial, sans-serif;">
            <h4 style="margin: 0 0 12px 0; color: #1e3a5f; font-size: 16px; border-bottom: 2px solid #4CAF50; padding-bottom: 6px;">
                🏠 Imóvel ${item.id}
            </h4>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                <div>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>🏘️ Bairro:</strong><br>${props.bairro}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>📐 Área:</strong><br>${window.formatNumber ? window.formatNumber(props.area_edificacao, 2) : (props.area_edificacao || 0).toFixed(2)} m²</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>⚡ Produção:</strong><br>${window.formatNumber ? window.formatNumber(props.producao_telhado, 2) : (props.producao_telhado || 0).toFixed(2)} kW</p>
                </div>
                <div>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>☀️ Radiação:</strong><br>${window.formatNumber ? window.formatNumber(props.radiacao_max, 2) : (props.radiacao_max || 0).toFixed(2)} kW/m²</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>🔋 Placas:</strong><br>${window.formatNumber ? window.formatNumber(props.quantidade_placas, 0) : (props.quantidade_placas || 0)} unidades</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>💰 Renda:</strong><br>R$ ${window.formatNumber ? window.formatNumber(props.renda_domiciliar_per_capita, 2) : (props.renda_domiciliar_per_capita || 0).toFixed(2)}</p>
                </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; border-left: 3px solid #4CAF50;">
                <p style="margin: 2px 0; font-size: 12px; font-weight: bold; color: #2E7D32;">
                    📊 Capacidade: ${window.formatNumber ? window.formatNumber(props.capacidade_por_m2, 2) : (props.capacidade_por_m2 || 0).toFixed(2)} kW/m²
                </p>
            </div>
        </div>
    `;
}

// ================================
// SELEÇÃO DE POLÍGONO
// ================================
function selectPolygon(imovelId, polygon) {
    // Limpar seleção anterior
    if (selectedPolygon) {
        selectedPolygon.setStyle({
            weight: 0.5,
            opacity: 0.8,
            fillOpacity: 0.8,
            color: '#ffffff'
        });
    }

    // Aplicar estilo de seleção mais visível
    polygon.setStyle({
        weight: 4,
        opacity: 1,
        fillOpacity: 1,
        color: '#FF0000'
    });

    selectedPolygon = polygon;

    // Chamar seleção no dashboard
    if (window.selecionarImovel) {
        window.selecionarImovel(imovelId);
    }

    console.log(`🎯 Polígono ${imovelId} selecionado`);
}

// ================================
// CENTRALIZAR NO IMÓVEL
// ================================
function centerOnImovel(imovelId) {
    const imovel = window.dadosCompletos?.find(item => item.id === imovelId);
    if (imovel && imovel.centroid && mapInstance) {
        mapInstance.setView([imovel.centroid[0], imovel.centroid[1]], 16);
        console.log(`🎯 Centralizado no imóvel ${imovelId}`);
    }
}

// ================================
// LIMPAR SELEÇÃO
// ================================
function clearSelection() {
    if (selectedPolygon) {
        selectedPolygon.setStyle({
            weight: 0.5,
            opacity: 0.8,
            fillOpacity: 0.8,
            color: '#ffffff'
        });
        selectedPolygon = null;
        console.log('🔄 Seleção limpa');
    }
}

// ================================
// ATUALIZAR CORES DO MAPA
// ================================
function updateMapColors(field = 'capacidade_por_m2') {
    console.log(`🎨 Atualizando cores do mapa por: ${field}`);
    
    // Atualizar filtros ativos
    if (window.filtrosAtivos) {
        window.filtrosAtivos.info = field;
    }
    
    // Recriar todos os polígonos com novos filtros
    addPolygonsToMap();
}

// ================================
// FILTRAR POLÍGONOS NO MAPA
// ================================
function filterMapPolygons() {
    console.log('🔍 Aplicando filtros no mapa...');
    
    if (!window.filtrarDados) {
        console.warn('⚠️ Função filtrarDados não disponível');
        return;
    }

    // Recriar o mapa completamente com os dados filtrados
    addPolygonsToMap();
    
    console.log('✅ Filtros aplicados no mapa');
}

// ================================
// FUNÇÃO DE DIAGNÓSTICO DO MAPA
// ================================
function diagnosticMap() {
    console.log('🔍 === DIAGNÓSTICO DO MAPA ===');
    console.log('mapInstance:', !!mapInstance);
    console.log('layerGroup:', !!layerGroup);
    console.log('dadosCompletos:', window.dadosCompletos?.length || 0);
    console.log('Polígonos no mapa:', layerGroup?.getLayers().length || 0);
    console.log('Paleta ativa:', ACTIVE_GRADIENT.length, 'cores');
    
    if (window.dadosCompletos && window.dadosCompletos.length > 0) {
        const primeiro = window.dadosCompletos[0];
        console.log('Primeiro item:');
        console.log('  - ID:', primeiro.id);
        console.log('  - Bairro:', primeiro.properties?.bairro);
        console.log('  - Área:', primeiro.properties?.area_edificacao);
        console.log('  - Produção:', primeiro.properties?.producao_telhado);
        console.log('  - Capacidade/m²:', primeiro.properties?.capacidade_por_m2);
        console.log('  - Radiação:', primeiro.properties?.radiacao_max);
        console.log('  - Placas:', primeiro.properties?.quantidade_placas);
        console.log('  - Centroid:', primeiro.centroid);
    }
    
    // Testar paletas
    console.log('🎨 Testando cores da paleta ativa:');
    for (let i = 0; i < ACTIVE_GRADIENT.length; i++) {
        const testValue = i / (ACTIVE_GRADIENT.length - 1);
        const color = getGradientColor(testValue, 0, 1);
        console.log(`  ${i}: ${ACTIVE_GRADIENT[i]} → ${color}`);
    }
}

// ================================
// FUNÇÃO DE TESTE RÁPIDO DO MAPA
// ================================
function testeRapidoMapa() {
    console.log('🧪 === TESTE RÁPIDO DO MAPA ===');
    
    if (!window.dadosCompletos || window.dadosCompletos.length === 0) {
        console.error('❌ Dados não carregados');
        return;
    }
    
    // Limpar mapa
    if (layerGroup) {
        layerGroup.clearLayers();
    }
    
    // Pegar primeiros 10 itens válidos com dados reais
    const itensValidos = window.dadosCompletos.filter(item => 
        item.coordinates && item.coordinates.length > 0 &&
        item.centroid && item.centroid.length === 2 &&
        item.properties?.area_edificacao > 0
    ).slice(0, 10);
    
    console.log(`🧪 Testando com ${itensValidos.length} itens válidos`);
    
    // Calcular valores para teste de gradiente
    const valores = itensValidos.map(item => item.properties.capacidade_por_m2 || 0);
    const minVal = Math.min(...valores);
    const maxVal = Math.max(...valores);
    
    itensValidos.forEach((item, index) => {
        try {
            const valor = item.properties.capacidade_por_m2 || 0;
            const color = getGradientColor(valor, minVal, maxVal);
            
            const polygon = L.polygon(item.coordinates, {
                color: '#ffffff',
                weight: 1,
                opacity: 1,
                fillColor: color,
                fillOpacity: 0.8
            });
            
            const popupContent = createPopupContentFixed(item);
            polygon.bindPopup(popupContent);
            
            layerGroup.addLayer(polygon);
            
            console.log(`✅ Polígono teste ${index + 1} adicionado:`);
            console.log(`   ID: ${item.id} (${item.properties.bairro})`);
            console.log(`   Valor: ${valor}`);
            console.log(`   Cor: ${color}`);
            
        } catch (error) {
            console.error(`❌ Erro no polígono teste ${item.id}:`, error);
        }
    });
    
    // Ajustar zoom
    if (layerGroup.getLayers().length > 0) {
        try {
            const featureGroup = new L.FeatureGroup(layerGroup.getLayers());
            mapInstance.fitBounds(featureGroup.getBounds());
            console.log('✅ Zoom ajustado para polígonos de teste');
            
            // Criar legenda de teste
            createMapLegend('capacidade_por_m2', minVal, maxVal);
            
        } catch (error) {
            console.warn('⚠️ Erro ao ajustar zoom no teste:', error);
        }
    }
}

// ================================
// VERIFICAR DADOS VÁLIDOS NO MAPA
// ================================
function verificarDadosValidosMapa() {
    console.log('🔍 === VERIFICAÇÃO DE DADOS VÁLIDOS ===');
    
    if (!window.dadosCompletos || window.dadosCompletos.length === 0) {
        console.error('❌ Nenhum dado carregado');
        return;
    }
    
    const total = window.dadosCompletos.length;
    let comCoordenadas = 0;
    let comCentroide = 0;
    let emSaoLuis = 0;
    let comDadosExcel = 0;
    let comValoresReais = 0;
    
    // Analisar distribuição de valores
    const valores = {};
    const campos = ['capacidade_por_m2', 'producao_telhado', 'area_edificacao', 'radiacao_max'];
    
    campos.forEach(campo => {
        valores[campo] = window.dadosCompletos
            .map(item => item.properties?.[campo] || 0)
            .filter(val => val > 0);
    });
    
    window.dadosCompletos.forEach(item => {
        if (item.coordinates && item.coordinates.length > 0) {
            comCoordenadas++;
        }
        
        if (item.centroid && item.centroid.length === 2) {
            comCentroide++;
            
            const [lat, lng] = item.centroid;
            if (lat >= -3 && lat <= -2 && lng >= -45 && lng <= -43) {
                emSaoLuis++;
            }
        }
        
        if (item.isLinked) {
            comDadosExcel++;
        }
        
        if (item.properties?.area_edificacao > 0 || 
            item.properties?.producao_telhado > 0 || 
            item.properties?.capacidade_por_m2 > 0) {
            comValoresReais++;
        }
    });
    
    console.log(`📊 Total de itens: ${total}`);
    console.log(`📍 Com coordenadas: ${comCoordenadas}`);
    console.log(`🎯 Com centroide: ${comCentroide}`);
    console.log(`🗺️ Em São Luís: ${emSaoLuis}`);
    console.log(`📋 Com dados Excel: ${comDadosExcel}`);
    console.log(`📈 Com valores reais: ${comValoresReais}`);
    
    // Estatísticas por campo
    console.log('\n📊 Distribuição de valores:');
    campos.forEach(campo => {
        const vals = valores[campo];
        if (vals.length > 0) {
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            
            console.log(`  ${campo}:`);
            console.log(`    Min: ${min.toFixed(2)}`);
            console.log(`    Max: ${max.toFixed(2)}`);
            console.log(`    Média: ${avg.toFixed(2)}`);
            console.log(`    Registros: ${vals.length}`);
        }
    });
    
    // Verificar bairros
    const bairros = [...new Set(window.dadosCompletos.map(item => item.properties?.bairro).filter(b => b && b !== 'Não informado'))];
    console.log(`\n🏘️ Bairros únicos: ${bairros.length}`);
    console.log('🏘️ Lista:', bairros);
}

// ================================
// FUNÇÃO PARA TESTAR PALETAS
// ================================
function testarPaletas() {
    console.log('🎨 === TESTE DE PALETAS ===');
    
    const paletas = {
        'Rica': GRADIENT_COLORS_RICH,
        'Solar': GRADIENT_COLORS_SOLAR,
        'Vibrante': GRADIENT_COLORS_VIBRANT
    };
    
    Object.entries(paletas).forEach(([nome, cores]) => {
        console.log(`\n🎨 Paleta ${nome} (${cores.length} cores):`);
        cores.forEach((cor, index) => {
            console.log(`  ${index}: ${cor}`);
        });
        
        // Testar interpolação
        console.log(`  Interpolação teste:`);
        for (let i = 0; i <= 10; i++) {
            const valor = i / 10;
            const corInterpolada = getGradientColorForPalette(valor, 0, 1, cores);
            console.log(`    ${valor.toFixed(1)}: ${corInterpolada}`);
        }
    });
}

// ================================
// FUNÇÃO AUXILIAR PARA TESTAR CORES DE PALETAS
// ================================
function getGradientColorForPalette(valor, minValue, maxValue, palette) {
    if (maxValue === minValue) {
        return palette[Math.floor(palette.length / 2)];
    }
    
    const normalized = Math.max(0, Math.min(1, (valor - minValue) / (maxValue - minValue)));
    const index = normalized * (palette.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    
    if (lowerIndex === upperIndex) {
        return palette[lowerIndex];
    }
    
    const factor = index - lowerIndex;
    return interpolateColors(palette[lowerIndex], palette[upperIndex], factor);
}

// ================================
// EXPORTAÇÕES GLOBAIS
// ================================
window.initMap = initMap;
window.addPolygonsToMap = addPolygonsToMap;
window.selectPolygon = selectPolygon;
window.centerOnImovel = centerOnImovel;
window.clearSelection = clearSelection;
window.updateMapColors = updateMapColors;
window.filterMapPolygons = filterMapPolygons;
window.createMapLegend = createMapLegend;
window.getGradientColor = getGradientColor;
window.changePalette = changePalette;
window.autoZoomToBairro = autoZoomToBairro;
window.formatNumberWithDots = formatNumberWithDots;
window.diagnosticMap = diagnosticMap;
window.testeRapidoMapa = testeRapidoMapa;
window.verificarDadosValidosMapa = verificarDadosValidosMapa;
window.testarPaletas = testarPaletas;
window.createPopupContentFixed = createPopupContentFixed;
window.interpolateColors = interpolateColors;

// Exportar paletas
window.GRADIENT_COLORS_RICH = GRADIENT_COLORS_RICH;
window.GRADIENT_COLORS_SOLAR = GRADIENT_COLORS_SOLAR;
window.GRADIENT_COLORS_VIBRANT = GRADIENT_COLORS_VIBRANT;

console.log('✅ MAP.JS MELHORADO COMPLETO - Sistema de cores avançado!');
console.log('🎨 Paletas disponíveis: Rica (7 cores), Solar (8 cores), Vibrante (9 cores)');
console.log('🧪 Execute testeRapidoMapa() para teste');
console.log('🔍 Execute verificarDadosValidosMapa() para diagnóstico');
console.log('🎨 Execute testarPaletas() para testar todas as paletas');
console.log('🔍 Execute diagnosticMap() para verificação geral');
