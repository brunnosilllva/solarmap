// ================================
// MAPA INTERATIVO - SOLARMAP
// VERSÃO FINAL CORRIGIDA - Problemas de exibição resolvidos
// ================================

// Variáveis globais do mapa
let mapInstance;
let layerGroup;
let selectedPolygon = null;
let legendControl = null;
let allPolygons = [];

// Cores NOVAS: Amarelo queimado → Laranja → Vermelho vivo
const GRADIENT_COLORS = [
    '#DAA520', '#FF8C00', '#FF7F00', '#FF6500',  // Amarelo queimado → Laranja
    '#FF4500', '#FF2500', '#FF0000', '#DC143C'   // Laranja → Vermelho vivo
];

// ================================
// FUNÇÃO DE FORMATAÇÃO CORRIGIDA
// ================================
function formatNumberWithDots(numero, decimais = 2) {
    if (numero === null || numero === undefined || isNaN(numero)) {
        return '0,00';
    }
    
    // Usar formatação brasileira com pontos nos milhares
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais
    }).format(numero);
}

// ================================
// INICIALIZAÇÃO DO MAPA
// ================================
function initMap() {
    console.log('🗺️ Inicializando mapa final corrigido...');
    
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
    
    // Títulos dos campos
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
        
        // Criar gradiente CSS
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
        
        // Labels de valores - FORMATAÇÃO CORRIGIDA
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
// FUNÇÃO PARA OBTER COR DO GRADIENTE
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
            maxZoom: 14  // Zoom máximo para não ficar muito próximo
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
// ADICIONAR POLÍGONOS AO MAPA - VERSÃO FINAL CORRIGIDA
// ================================
function addPolygonsToMap() {
    console.log('📍 === ADICIONANDO POLÍGONOS (VERSÃO FINAL CORRIGIDA) ===');
    
    if (!window.dadosCompletos || window.dadosCompletos.length === 0) {
        console.error('❌ dadosCompletos não disponível');
        console.error('❌ Verifique se os dados foram carregados corretamente');
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
        console.error('❌ PROBLEMA CRÍTICO: Nenhum dado válido para o mapa!');
        console.log('🔍 Analisando primeiro item dos dados filtrados:');
        if (dadosFiltrados.length > 0) {
            const primeiro = dadosFiltrados[0];
            console.log('  - Item:', primeiro.id);
            console.log('  - Tem coordinates:', !!primeiro.coordinates);
            console.log('  - Coordinates length:', primeiro.coordinates?.length);
            console.log('  - Tem centroid:', !!primeiro.centroid);
            console.log('  - Centroid:', primeiro.centroid);
            console.log('  - Centroid em São Luís:', 
                primeiro.centroid && 
                primeiro.centroid[0] >= -3 && primeiro.centroid[0] <= -2 &&
                primeiro.centroid[1] >= -45 && primeiro.centroid[1] <= -43
            );
        }
        return;
    }
    
    // Calcular min/max para cores
    const values = dadosValidosParaMapa
        .map(item => item.properties?.[currentField] || 0)
        .filter(val => val > 0);
    
    if (values.length === 0) {
        console.warn('⚠️ Nenhum valor válido para coloração, usando valores padrão');
        values.push(1); // Valor padrão para evitar erro
    }
    
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    console.log(`🎨 Coloração por: ${currentField}`);
    console.log(`📊 Valores: ${minValue.toFixed(2)} - ${maxValue.toFixed(2)}`);
    console.log(`📍 Processando ${dadosValidosParaMapa.length} polígonos válidos`);

    let sucessos = 0;
    let erros = 0;

    // Processar cada item válido
    dadosValidosParaMapa.forEach((item, index) => {
        try {
            // Verificar novamente se coordenadas são válidas
            if (!item.coordinates || !Array.isArray(item.coordinates) || item.coordinates.length === 0) {
                console.warn(`⚠️ Item ${item.id} sem coordenadas válidas`);
                erros++;
                return;
            }

            // Verificar formato das coordenadas para Leaflet
            const coordsValidas = item.coordinates.every(coord => 
                Array.isArray(coord) && 
                coord.length === 2 && 
                typeof coord[0] === 'number' && 
                typeof coord[1] === 'number' &&
                !isNaN(coord[0]) && !isNaN(coord[1])
            );

            if (!coordsValidas) {
                console.warn(`⚠️ Item ${item.id} com coordenadas em formato inválido`);
                erros++;
                return;
            }

            // Calcular cor
            const fieldValue = item.properties?.[currentField] || 0;
            const color = getGradientColor(fieldValue, minValue, maxValue);

            // Criar polígono
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

            // Popup
            const popupContent = createPopupContent(item);
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
                console.log(`✅ Polígono ${item.id} adicionado com sucesso:`);
                console.log(`   Coordenadas: ${item.coordinates.length} pontos`);
                console.log(`   Centroide: [${item.centroid[0].toFixed(6)}, ${item.centroid[1].toFixed(6)}]`);
                console.log(`   Valor ${currentField}: ${fieldValue}`);
                console.log(`   Cor: ${color}`);
                console.log(`   Bairro: ${item.properties?.bairro}`);
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
            const bounds = layerGroup.getBounds();
            if (bounds.isValid()) {
                mapInstance.fitBounds(bounds, { padding: [20, 20] });
                console.log('✅ Zoom ajustado automaticamente para os polígonos');
            } else {
                console.warn('⚠️ Bounds inválidos, mantendo zoom atual');
            }
        } catch (error) {
            console.warn('⚠️ Erro ao ajustar zoom:', error);
        }
    } else {
        console.error('❌ NENHUM POLÍGONO FOI ADICIONADO AO MAPA!');
        console.log('🔍 Verifique se:');
        console.log('  1. Os dados foram carregados corretamente');
        console.log('  2. As coordenadas estão no formato correto');
        console.log('  3. A conversão UTM→WGS84 está funcionando');
        console.log('  4. As coordenadas estão dentro dos bounds de São Luís');
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
// CRIAR CONTEÚDO DO POPUP - FORMATAÇÃO CORRIGIDA
// ================================
function createPopupContent(item) {
    const props = item.properties;
    
    return `
        <div style="min-width: 280px;">
            <h4 style="margin: 0 0 10px 0; color: #1e3a5f;">
                🏠 Imóvel ${window.formatNumber ? window.formatNumber(item.id, 0) : item.id}
            </h4>
            <p><strong>Bairro:</strong> ${props.bairro || 'N/A'}</p>
            <p><strong>Área:</strong> ${window.formatNumber ? window.formatNumber(props.area_edificacao, 2) : (props.area_edificacao || 0).toFixed(2)} m²</p>
            <p><strong>Produção:</strong> ${window.formatNumber ? window.formatNumber(props.producao_telhado, 2) : (props.producao_telhado || 0).toFixed(2)} kW</p>
            <p><strong>Capacidade/m²:</strong> ${window.formatNumber ? window.formatNumber(props.capacidade_por_m2, 2) : (props.capacidade_por_m2 || 0).toFixed(2)} kW/m²</p>
            <p><strong>Radiação:</strong> ${window.formatNumber ? window.formatNumber(props.radiacao_max, 2) : (props.radiacao_max || 0).toFixed(2)} kW/m²</p>
            <p><strong>Placas:</strong> ${window.formatNumber ? window.formatNumber(props.quantidade_placas, 0) : (props.quantidade_placas || 0)} unidades</p>
            <p><strong>Coordenadas:</strong> ${item.centroid[0].toFixed(4)}, ${item.centroid[1].toFixed(4)}</p>
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
        console.log('Primeiro item válido:');
        console.log('  - ID:', primeiro.id);
        console.log('  - Coordinates:', primeiro.coordinates?.length);
        console.log('  - Centroid:', primeiro.centroid);
        console.log('  - Bairro:', primeiro.properties?.bairro);
        console.log('  - Em São Luís:', 
            primeiro.centroid && 
            primeiro.centroid[0] >= -3 && primeiro.centroid[0] <= -2 &&
            primeiro.centroid[1] >= -45 && primeiro.centroid[1] <= -43
        );
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
    
    // Pegar primeiros 5 itens válidos
    const itensValidos = window.dadosCompletos.filter(item => 
        item.coordinates && item.coordinates.length > 0 &&
        item.centroid && item.centroid.length === 2
    ).slice(0, 5);
    
    console.log(`🧪 Testando com ${itensValidos.length} itens`);
    
    itensValidos.forEach((item, index) => {
        try {
            const polygon = L.polygon(item.coordinates, {
                color: '#FF8C00',
                weight: 2,
                opacity: 1,
                fillColor: '#FFB347',
                fillOpacity: 0.7
            });
            
            polygon.bindPopup(`Teste - Imóvel ${item.id}`);
            layerGroup.addLayer(polygon);
            
            console.log(`✅ Polígono teste ${index + 1} adicionado: ${item.id}`);
            
        } catch (error) {
            console.error(`❌ Erro no polígono teste ${item.id}:`, error);
        }
    });
    
    // Ajustar zoom
    if (layerGroup.getLayers().length > 0) {
        mapInstance.fitBounds(layerGroup.getBounds());
        console.log('✅ Zoom ajustado para polígonos de teste');
    }
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

console.log('✅ MAP.JS FINAL CORRIGIDO - Problemas de exibição resolvidos!');
console.log('🧪 Execute testeRapidoMapa() para teste rápido');
console.log('🔍 Execute diagnosticMap() para diagnóstico');
