// ================================
// MAPA INTERATIVO - SOLARMAP
// VERSÃO CORRIGIDA: MAIS CORES + FORMATAÇÃO BR
// ================================

// Variáveis globais do mapa
let mapInstance;
let layerGroup;
let selectedPolygon = null;
let legendControl = null;
let allPolygons = [];

// CORES EXPANDIDAS - MAIS VARIAÇÃO VISUAL (16 tons)
const GRADIENT_COLORS = [
    '#FFF8F0',  // Branco quase
    '#FFF0E6',  // Laranja ultra claro
    '#FFE8D6',  // Laranja muito claro 1
    '#FFE0C7',  // Laranja muito claro 2
    '#FFD8B8',  // Laranja claro 1
    '#FFD0A8',  // Laranja claro 2
    '#FFC080',  // Laranja médio claro
    '#FFB366',  // Laranja médio
    '#FFA64D',  // Laranja
    '#FF9933',  // Laranja escuro 1
    '#FF8C1A',  // Laranja escuro 2
    '#FF7F00',  // Laranja forte
    '#E6720A',  // Laranja muito forte
    '#CC6600',  // Vermelho alaranjado
    '#B35900',  // Vermelho escuro 1
    '#994D00'   // Vermelho escuro 2
];

// ================================
// FUNÇÃO DE FORMATAÇÃO BRASILEIRA CORRIGIDA
// ================================
function formatarNumeroBrasileiro(numero, decimais = 2) {
    if (numero === null || numero === undefined || isNaN(numero)) {
        return '0,00';
    }
    
    // Converter para número se for string
    const num = typeof numero === 'string' ? parseFloat(numero) : numero;
    
    if (isNaN(num)) {
        return '0,00';
    }
    
    // Usar toLocaleString com configuração brasileira
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais
    });
}

// ================================
// INICIALIZAÇÃO DO MAPA
// ================================
function initMap() {
    console.log('🗺️ Inicializando mapa com cores expandidas...');
    
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
// CRIAR LEGENDA EM GRADIENTE MELHORADA
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
            min-width: 200px;
        `;
        
        // Título da legenda
        div.innerHTML = `<h4 style="margin: 0 0 10px 0; color: #1e3a5f; font-size: 14px; font-weight: bold;">${title}</h4>`;
        
        // Criar gradiente CSS mais suave com 16 cores
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
        
        // Labels de valores com formatação brasileira
        const formatMin = formatarNumeroBrasileiro(minValue, 1);
        const formatMax = formatarNumeroBrasileiro(maxValue, 1);
        const formatMid = formatarNumeroBrasileiro((minValue + maxValue) / 2, 1);
        
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
                ${dadosFiltrados.length} imóveis exibidos
            </div>
        `;
        
        return div;
    };
    
    legendControl.addTo(mapInstance);
    console.log(`🎨 Legenda expandida criada para ${title}`);
}

// ================================
// FUNÇÃO MELHORADA PARA OBTER COR DO GRADIENTE
// ================================
function getGradientColor(valor, minValue, maxValue) {
    if (maxValue === minValue) {
        return GRADIENT_COLORS[0];
    }
    
    // Normalizar valor entre 0 e 1
    const normalized = Math.max(0, Math.min(1, (valor - minValue) / (maxValue - minValue)));
    
    // Mapear para o índice das cores (0 a 15)
    const colorIndex = normalized * (GRADIENT_COLORS.length - 1);
    const lowerIndex = Math.floor(colorIndex);
    const upperIndex = Math.min(Math.ceil(colorIndex), GRADIENT_COLORS.length - 1);
    
    // Se os índices são iguais, retornar a cor diretamente
    if (lowerIndex === upperIndex) {
        return GRADIENT_COLORS[lowerIndex];
    }
    
    // Interpolação suave entre duas cores adjacentes
    const factor = colorIndex - lowerIndex;
    const lowerColor = GRADIENT_COLORS[lowerIndex];
    const upperColor = GRADIENT_COLORS[upperIndex];
    
    return interpolateColors(lowerColor, upperColor, factor);
}

// ================================
// FUNÇÃO DE INTERPOLAÇÃO DE CORES MELHORADA
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
// ADICIONAR POLÍGONOS AO MAPA
// ================================
function addPolygonsToMap() {
    console.log('📍 Adicionando polígonos com 16 cores expandidas...');
    
    if (!window.dadosCompletos || window.dadosCompletos.length === 0) {
        console.error('❌ Dados não disponíveis para o mapa');
        return;
    }

    if (!layerGroup) {
        console.error('❌ Layer group não inicializado');
        return;
    }

    // Limpar polígonos existentes
    layerGroup.clearLayers();
    allPolygons = [];

    const currentField = window.filtrosAtivos?.info || 'capacidade_por_m2';
    
    // Obter dados filtrados
    const dadosFiltrados = window.filtrarDados();
    
    // Calcular min/max apenas dos dados filtrados
    const values = dadosFiltrados
        .map(item => item.properties[currentField] || 0)
        .filter(val => val > 0);
    
    if (values.length === 0) {
        console.warn('⚠️ Nenhum dado válido para exibir no mapa');
        return;
    }
    
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    console.log(`🎨 Gradiente expandido por: ${currentField} (${minValue} - ${maxValue})`);
    console.log(`📊 Exibindo ${dadosFiltrados.length} de ${window.dadosCompletos.length} polígonos`);

    // Criar legenda
    createMapLegend(currentField, minValue, maxValue);

    let polygonCount = 0;
    let errorCount = 0;

    // Adicionar apenas os polígonos filtrados
    dadosFiltrados.forEach(item => {
        try {
            if (!item.coordinates || item.coordinates.length === 0) {
                errorCount++;
                return;
            }

            // Converter coordenadas para formato Leaflet [lat, lng]
            const leafletCoords = item.coordinates.map(coord => [coord[0], coord[1]]);
            
            // Valor para coloração com gradiente expandido
            const fieldValue = item.properties[currentField] || 0;
            const color = getGradientColor(fieldValue, minValue, maxValue);

            // Criar polígono SEM BORDAS
            const polygon = L.polygon(leafletCoords, {
                color: color,
                weight: 0,
                opacity: 0,
                fillColor: color,
                fillOpacity: 0.8
            });

            // Armazenar referência do item no polígono
            polygon.itemId = item.id;
            polygon.itemData = item;

            // Criar popup com formatação brasileira
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
                        fillOpacity: 0.8,
                        color: color
                    });
                }
            });

            // Adicionar ao layer group e à lista
            layerGroup.addLayer(polygon);
            allPolygons.push(polygon);
            polygonCount++;

        } catch (error) {
            console.error(`❌ Erro ao processar polígono ${item.id}:`, error);
            errorCount++;
        }
    });

    console.log(`✅ Polígonos com 16 cores adicionados: ${polygonCount}`);
    if (errorCount > 0) {
        console.warn(`⚠️ Erros encontrados: ${errorCount}`);
    }

    // Ajustar zoom para mostrar todos os polígonos filtrados
    if (polygonCount > 0) {
        try {
            mapInstance.fitBounds(layerGroup.getBounds(), { padding: [10, 10] });
        } catch (error) {
            console.warn('⚠️ Não foi possível ajustar zoom automaticamente');
        }
    }
}

// ================================
// CRIAR CONTEÚDO DO POPUP COM FORMATAÇÃO BRASILEIRA
// ================================
function createPopupContent(item) {
    const props = item.properties;
    
    return `
        <div style="min-width: 280px; font-family: Arial, sans-serif;">
            <h4 style="margin: 0 0 10px 0; color: #1e3a5f; font-size: 16px;">
                🏠 Imóvel ${item.id}
            </h4>
            <p style="margin: 5px 0;"><strong>Bairro:</strong> ${props.bairro}</p>
            <p style="margin: 5px 0;"><strong>Área:</strong> ${formatarNumeroBrasileiro(props.area_edificacao)} m²</p>
            <p style="margin: 5px 0;"><strong>Produção:</strong> ${formatarNumeroBrasileiro(props.producao_telhado)} kW</p>
            <p style="margin: 5px 0;"><strong>Radiação:</strong> ${formatarNumeroBrasileiro(props.radiacao_max)} kW/m²</p>
            <p style="margin: 5px 0;"><strong>Capacidade/m²:</strong> ${formatarNumeroBrasileiro(props.capacidade_por_m2)} kW</p>
            <p style="margin: 5px 0;"><strong>Placas:</strong> ${formatarNumeroBrasileiro(props.quantidade_placas, 0)} unidades</p>
            <p style="margin: 5px 0;"><strong>Produção Mensal:</strong> ${formatarNumeroBrasileiro(props.capacidade_placas_mes)} kWh</p>
            <p style="margin: 5px 0;"><strong>Renda Domiciliar:</strong> R$ ${formatarNumeroBrasileiro(props.renda_domiciliar_per_capita)}</p>
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
            fillOpacity: 0.8
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
            fillOpacity: 0.8
        });
        selectedPolygon = null;
        console.log('🔄 Seleção limpa');
    }
}

// ================================
// ATUALIZAR CORES DO MAPA
// ================================
function updateMapColors(field = 'capacidade_por_m2') {
    console.log(`🎨 Atualizando gradiente expandido do mapa por: ${field}`);
    
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
    console.log('🔍 Aplicando filtros no mapa (16 cores)...');
    
    if (!window.filtrarDados) {
        console.warn('⚠️ Função filtrarDados não disponível');
        return;
    }

    // Recriar o mapa completamente com os dados filtrados
    addPolygonsToMap();
    
    console.log('✅ Filtros aplicados - mapa com 16 cores atualizado');
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
window.createMapLegenda = createMapLegend;
window.getGradientColor = getGradientColor;
window.formatarNumeroBrasileiro = formatarNumeroBrasileiro;
window.GRADIENT_COLORS = GRADIENT_COLORS;

console.log('✅ MAP.JS CORRIGIDO - 16 cores + formatação brasileira implementada!');
