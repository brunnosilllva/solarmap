// ================================
// MAPA INTERATIVO - SOLARMAP
// VERSÃO COM AUTO-ZOOM E FORMATAÇÃO CORRIGIDA
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
    console.log('🗺️ Inicializando mapa com auto-zoom...');
    
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
        
        // Labels de valores - FORMATAÇÃO BRASILEIRA MANUAL
        const formatarBrasileiro = (valor, decimais = 1) => {
            const valorFixo = parseFloat(valor).toFixed(decimais);
            const [parteInteira, parteDecimal] = valorFixo.split('.');
            const inteiraFormatada = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return decimais > 0 ? inteiraFormatada + ',' + parteDecimal : inteiraFormatada;
        };
        
        const formatMin = formatarBrasileiro(minValue, 1);
        const formatMax = formatarBrasileiro(maxValue, 1);
        const formatMid = formatarBrasileiro((minValue + maxValue) / 2, 1);
        
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
// NOVO: AUTO-ZOOM PARA BAIRRO SELECIONADO
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
// ADICIONAR POLÍGONOS AO MAPA
// ================================
function addPolygonsToMap() {
    console.log('📍 Adicionando polígonos com gradiente e auto-zoom...');
    
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
    
    // Calcular min/max apenas dos dados filtrados USANDO VALORES NUMÉRICOS
    const values = dadosFiltrados
        .map(item => item.properties[currentField + '_numerico'] || 0)
        .filter(val => val > 0);
    
    if (values.length === 0) {
        console.warn('⚠️ Nenhum dado válido para exibir no mapa');
        return;
    }
    
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    console.log(`🎨 Gradiente por: ${currentField} (${minValue} - ${maxValue})`);
    console.log(`📊 Exibindo ${dadosFiltrados.length} de ${window.dadosCompletos.length} polígonos`);
    console.log(`📊 Valores numéricos encontrados: ${values.length}`);
    
    // DEBUG: Mostrar alguns valores para verificar
    console.log('🔍 Primeiros 5 valores numéricos:', values.slice(0, 5));
    console.log('🔍 Últimos 5 valores numéricos:', values.slice(-5));

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
            
            // Valor para coloração com gradiente - USAR VALOR NUMÉRICO
            const fieldValue = item.properties[currentField + '_numerico'] || 0;
            const color = getGradientColor(fieldValue, minValue, maxValue);
            
            console.log(`🎨 Imóvel ${item.id}: valor original="${item.properties[currentField]}", numérico=${fieldValue}, cor=${color}`);

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

            // Criar popup
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

    console.log(`✅ Polígonos com gradiente adicionados: ${polygonCount}`);
    if (errorCount > 0) {
        console.warn(`⚠️ Erros encontrados: ${errorCount}`);
    }

    // NOVO: Auto-zoom baseado no bairro selecionado
    const bairroSelecionado = window.filtrosAtivos?.bairros?.[0];
    autoZoomToBairro(bairroSelecionado);
}

// ================================
// CRIAR CONTEÚDO DO POPUP - FORMATAÇÃO BRASILEIRA CORRETA
// ================================
function createPopupContent(item) {
    if (!item.excelData) {
        return `
            <div style="min-width: 280px;">
                <h4 style="margin: 0 0 10px 0; color: #1e3a5f;">
                    🏠 Imóvel ${item.id}
                </h4>
                <p>Dados não disponíveis</p>
            </div>
        `;
    }
    
    const dados = item.excelData;
    
    // Buscar campos específicos EXATAMENTE como estão no Excel
    const buscarCampo = (termosChave) => {
        for (const termo of termosChave) {
            for (const [campo, valor] of Object.entries(dados)) {
                if (campo.toLowerCase().includes(termo.toLowerCase())) {
                    return valor || '0';
                }
            }
        }
        return '0';
    };
    
    const bairro = buscarCampo(['bairros', 'bairro']);
    const area = buscarCampo(['área em metros quadrados', 'área', 'area']);
    const producao = buscarCampo(['produção de energia kw do telhado', 'produção', 'producao']);
    const radiacao = buscarCampo(['quantidade de radiação máxima solar', 'radiação', 'radiacao']);
    const placas = buscarCampo(['quantidade de placas fotovoltaicas', 'placas']);
    const rendaTotal = buscarCampo(['renda domiciliar per capita', 'renda total']);
    
    console.log(`🔍 Popup Imóvel ${item.id}:`);
    console.log(`  Produção original: "${producao}"`);
    console.log(`  Produção numérica: ${item.properties.producao_telhado_numerico}`);
    
    // FORMATAÇÃO BRASILEIRA MANUAL para popup
    const formatarParaPopup = (valor) => {
        if (!valor || valor === '0') return '0,00';
        
        // Converter para número se for string
        let num = valor;
        if (typeof valor === 'string') {
            num = window.converterParaNumero ? window.converterParaNumero(valor) : parseFloat(valor);
            if (isNaN(num)) return valor; // Se não conseguir converter, retornar original
        }
        
        // Formatação brasileira manual
        const valorFixo = parseFloat(num).toFixed(2);
        const [parteInteira, parteDecimal] = valorFixo.split('.');
        const inteiraFormatada = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return inteiraFormatada + ',' + parteDecimal;
    };
    
    return `
        <div style="min-width: 280px;">
            <h4 style="margin: 0 0 10px 0; color: #1e3a5f;">
                🏠 Imóvel ${item.id}
            </h4>
            <p><strong>Bairro:</strong> ${bairro}</p>
            <p><strong>Área:</strong> ${formatarParaPopup(area)} m²</p>
            <p><strong>Produção:</strong> ${formatarParaPopup(producao)} kW</p>
            <p><strong>Radiação:</strong> ${formatarParaPopup(radiacao)} kW/m²</p>
            <p><strong>Placas:</strong> ${(() => {
                const num = window.converterParaNumero ? window.converterParaNumero(placas) : parseFloat(placas);
                if (isNaN(num)) return placas;
                const valorFixo = parseFloat(num).toFixed(0);
                return valorFixo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            })()} unidades</p>
            <p><strong>Renda Total:</strong> R$ ${formatarParaPopup(rendaTotal)}</p>
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
    console.log(`🎨 Atualizando gradiente do mapa por: ${field}`);
    
    // Atualizar filtros ativos
    if (window.filtrosAtivos) {
        window.filtrosAtivos.info = field;
    }
    
    // Recriar todos os polígonos com novos filtros
    addPolygonsToMap();
}

// ================================
// FILTRAR POLÍGONOS NO MAPA - CORRIGIDO COM AUTO-ZOOM
// ================================
function filterMapPolygons() {
    console.log('🔍 Aplicando filtros no mapa (gradiente + auto-zoom)...');
    
    if (!window.filtrarDados) {
        console.warn('⚠️ Função filtrarDados não disponível');
        return;
    }

    // Recriar o mapa completamente com os dados filtrados
    addPolygonsToMap();
    
    console.log('✅ Filtros aplicados - mapa com gradiente e auto-zoom atualizado');
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
window.GRADIENT_COLORS = GRADIENT_COLORS;
window.autoZoomToBairro = autoZoomToBairro;
window.formatNumberWithDots = formatNumberWithDots;

console.log('✅ MAP.JS COM AUTO-ZOOM E FORMATAÇÃO CORRIGIDA!');
