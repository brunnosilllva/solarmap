// ================================
// MAPA INTERATIVO - SOLARMAP
// VERSÃO CORRIGIDA COMPLETA - Popup e funcionalidades conforme especificação
// ================================

// Variáveis globais do mapa
let mapInstance;
let layerGroup;
let selectedPolygon = null;
let legendControl = null;
let allPolygons = [];

// CORES GRADIENTE: Laranja → Vermelho (conforme especificação)
const GRADIENT_COLORS = [
    '#FFA500', '#FF8C00', '#FF7F00', '#FF6500',  // Laranja claro → médio
    '#FF4500', '#FF2500', '#FF0000', '#DC143C'   // Laranja escuro → Vermelho
];

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
        
    } catch (error) {
        console.error('❌ Erro ao inicializar mapa:', error);
        throw error;
    }
}

// ================================
// CRIAR LEGENDA EM GRADIENTE
// ================================
function createMapLegend(currentField, minValue, maxValue) {
    // Remover legenda anterior se existir
    if (legendControl) {
        mapInstance.removeControl(legendControl);
    }
    
    // Títulos dos campos conforme especificação
    const fieldTitles = {
        'capacidade_por_m2': 'Capacidade por m² (kW)',
        'producao_telhado': 'Produção do Telhado (kW)'
    };
    
    const title = fieldTitles[currentField] || currentField;
    
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
            min-width: 180px;
        `;
        
        // Título da legenda
        div.innerHTML = `<h4 style="margin: 0 0 10px 0; color: #1e3a5f; font-size: 14px; font-weight: bold;">${title}</h4>`;
        
        // Criar gradiente CSS (Laranja → Vermelho)
        const gradientStops = GRADIENT_COLORS.map((color, index) => {
            const percentage = (index / (GRADIENT_COLORS.length - 1)) * 100;
            return `${color} ${percentage}%`;
        }).join(', ');
        
        // Container do gradiente
        div.innerHTML += `
            <div style="
                height: 20px;
                background: linear-gradient(to right, ${gradientStops});
                border: 1px solid #ccc;
                border-radius: 4px;
                margin-bottom: 8px;
            "></div>
        `;
        
        // Labels de valores
        const formatMin = window.formatNumber ? window.formatNumber(minValue, 1) : minValue.toFixed(1);
        const formatMax = window.formatNumber ? window.formatNumber(maxValue, 1) : maxValue.toFixed(1);
        const formatMid = window.formatNumber ? window.formatNumber((minValue + maxValue) / 2, 1) : ((minValue + maxValue) / 2).toFixed(1);
        
        div.innerHTML += `
            <div style="
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                color: #666;
                margin-top: 5px;
            ">
                <span>${formatMin}</span>
                <span>${formatMid}</span>
                <span>${formatMax}</span>
            </div>
        `;
        
        // Adicionar contagem de polígonos
        const dadosFiltrados = window.filtrarDados ? window.filtrarDados() : [];
        div.innerHTML += `
            <div style="
                margin-top: 10px;
                padding-top: 8px;
                border-top: 1px solid #eee;
                font-size: 11px;
                color: #888;
                text-align: center;
            ">
                ${formatNumberWithDots(dadosFiltrados.length, 0)} imóveis exibidos
            </div>
        `;
        
        return div;
    };
    
    legendControl.addTo(mapInstance);
    console.log(`🎨 Legenda gradiente criada para ${title}`);
}

// ================================
// FUNÇÃO PARA OBTER COR DO GRADIENTE (LARANJA → VERMELHO)
// ================================
function getGradientColor(valor, minValue, maxValue) {
    if (maxValue === minValue) {
        return GRADIENT_COLORS[0];
    }
    
    const normalized = (valor - minValue) / (maxValue - minValue);
    const index = normalized * (GRADIENT_COLORS.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    
    if (lowerIndex === upperIndex) {
        return GRADIENT_COLORS[lowerIndex];
    }
    
    // Interpolação entre duas cores
    const factor = index - lowerIndex;
    const lowerColor = GRADIENT_COLORS[lowerIndex];
    const upperColor = GRADIENT_COLORS[upperIndex];
    
    // Converter hex para RGB, interpolar e converter de volta
    const lowerRgb = hexToRgb(lowerColor);
    const upperRgb = hexToRgb(upperColor);
    
    const r = Math.round(lowerRgb.r + (upperRgb.r - lowerRgb.r) * factor);
    const g = Math.round(lowerRgb.g + (upperRgb.g - lowerRgb.g) * factor);
    const b = Math.round(lowerRgb.b + (upperRgb.b - lowerRgb.b) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
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
// ADICIONAR POLÍGONOS AO MAPA - VERSÃO CORRIGIDA
// ================================
function addPolygonsToMap() {
    console.log('📍 === ADICIONANDO POLÍGONOS (VERSÃO CORRIGIDA) ===');
    
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
    }

    console.log(`🎨 Coloração por: ${currentField}`);
    console.log(`📊 Valores: ${minValue.toFixed(2)} - ${maxValue.toFixed(2)}`);
    console.log(`📍 Processando ${dadosValidosParaMapa.length} polígonos válidos`);

    let sucessos = 0;
    let erros = 0;

    // Processar cada item válido
    dadosValidosParaMapa.forEach((item, index) => {
        try {
            // Calcular cor
            const fieldValue = item.properties?.[currentField] || 0;
            const color = getGradientColor(fieldValue, minValue, maxValue);

            // Criar polígono com gradiente Laranja → Vermelho
            const polygon = L.polygon(item.coordinates, {
                color: color,
                weight: 0,
                opacity: 0,
                fillColor: color,
                fillOpacity: 0.7
            });

            // Dados do polígono
            polygon.itemId = item.id;
            polygon.itemData = item;

            // POPUP CONFORME ESPECIFICAÇÃO
            const popupContent = createPopupContentFixed(item);
            polygon.bindPopup(popupContent);

            // Eventos do polígono
            polygon.on('click', function(e) {
                selectPolygon(item.id, polygon);
            });

            polygon.on('mouseover', function(e) {
                this.setStyle({
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9,
                    color: '#ffffff'
                });
            });

            polygon.on('mouseout', function(e) {
                if (selectedPolygon !== polygon) {
                    this.setStyle({
                        weight: 0,
                        opacity: 0,
                        fillOpacity: 0.7,
                        color: color
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

    // Criar legenda se há polígonos
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
// CRIAR CONTEÚDO DO POPUP - CONFORME ESPECIFICAÇÃO
// ================================
function createPopupContentFixed(item) {
    const props = item.properties;
    
    // POPUP CONFORME ESPECIFICAÇÃO EXATA
    return `
        <div style="min-width: 280px; font-family: Arial, sans-serif;">
            <h4 style="margin: 0 0 10px 0; color: #1e3a5f; font-size: 16px;">
                🏠 Imóvel ${item.id}
            </h4>
            <p style="margin: 5px 0;"><strong>Bairro:</strong> ${props.bairro}</p>
            <p style="margin: 5px 0;"><strong>Área:</strong> ${window.formatNumber ? window.formatNumber(props.area_edificacao, 2) : (props.area_edificacao || 0).toFixed(2)} m²</p>
            <p style="margin: 5px 0;"><strong>Produção:</strong> ${window.formatNumber ? window.formatNumber(props.producao_telhado, 2) : (props.producao_telhado || 0).toFixed(2)} kW</p>
            <p style="margin: 5px 0;"><strong>Radiação:</strong> ${window.formatNumber ? window.formatNumber(props.radiacao_max, 2) : (props.radiacao_max || 0).toFixed(2)} kW/m²</p>
            <p style="margin: 5px 0;"><strong>Placas:</strong> ${window.formatNumber ? window.formatNumber(props.quantidade_placas, 0) : (props.quantidade_placas || 0)} unidades</p>
            <p style="margin: 5px 0;"><strong>Renda Total:</strong> R$ ${window.formatNumber ? window.formatNumber(props.renda_domiciliar_per_capita, 2) : (props.renda_domiciliar_per_capita || 0).toFixed(2)}</p>
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
            weight: 0,
            opacity: 0,
            fillOpacity: 0.7
        });
    }

    // Aplicar estilo de seleção
    polygon.setStyle({
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
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
            weight: 0,
            opacity: 0,
            fillOpacity: 0.7
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
    
    // Pegar primeiros 5 itens válidos com dados reais
    const itensValidos = window.dadosCompletos.filter(item => 
        item.coordinates && item.coordinates.length > 0 &&
        item.centroid && item.centroid.length === 2 &&
        item.properties?.area_edificacao > 0
    ).slice(0, 5);
    
    console.log(`🧪 Testando com ${itensValidos.length} itens válidos`);
    
    itensValidos.forEach((item, index) => {
        try {
            const color = GRADIENT_COLORS[index % GRADIENT_COLORS.length];
            
            const polygon = L.polygon(item.coordinates, {
                color: color,
                weight: 2,
                opacity: 1,
                fillColor: color,
                fillOpacity: 0.7
            });
            
            const popupContent = createPopupContentFixed(item);
            polygon.bindPopup(popupContent);
            
            layerGroup.addLayer(polygon);
            
            console.log(`✅ Polígono teste ${index + 1} adicionado: ${item.id} (${item.properties.bairro})`);
            
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
    
    // Verificar bairros
    const bairros = [...new Set(window.dadosCompletos.map(item => item.properties?.bairro).filter(b => b && b !== 'Não informado'))];
    console.log(`🏘️ Bairros únicos: ${bairros.length}`);
    console.log('🏘️ Lista:', bairros.slice(0, 10));
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
window.GRADIENT_COLORS = GRADIENT_COLORS;
window.autoZoomToBairro = autoZoomToBairro;
window.formatNumberWithDots = formatNumberWithDots;
window.diagnosticMap = diagnosticMap;
window.testeRapidoMapa = testeRapidoMapa;
window.verificarDadosValidosMapa = verificarDadosValidosMapa;
window.createPopupContentFixed = createPopupContentFixed;

console.log('✅ MAP.JS CORRIGIDO COMPLETO - Popup e gradiente conforme especificação!');
console.log('🧪 Execute testeRapidoMapa() para teste');
console.log('🔍 Execute verificarDadosValidosMapa() para diagnóstico');
console.log('🔍 Execute diagnosticMap() para verificação geral');
