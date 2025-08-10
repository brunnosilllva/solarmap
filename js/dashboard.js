// ================================
// DASHBOARD PRINCIPAL - SOLARMAP
// VERSÃO FINAL CORRIGIDA - Todos os problemas resolvidos
// ================================
console.log('🚀 Dashboard SolarMap - VERSÃO FINAL CORRIGIDA');

// ================================
// VARIÁVEIS GLOBAIS
// ================================
let dadosCompletos = [];
let dadosExcel = [];
let dadosGeoJSON = [];
let imovelSelecionado = null;
let estatisticas = {};
let estatisticasPorBairro = {};

// Filtros ativos
let filtrosAtivos = {
    bairros: [],
    info: 'capacidade_por_m2',
    minValue: null,
    maxValue: null
};

// Cores SolarMap
const CORES = {
    primary_blue: '#1e3a5f',
    secondary_blue: '#2c4a6b',
    accent_green: '#4a9b4a',
    solar_orange: '#ff8c00',
    light_orange: '#ffb347',
    neutral_gray: '#f5f6fa',
    dark_gray: '#2f3640',
    white: '#ffffff',
    success: '#27ae60',
    warning: '#f39c12',
    danger: '#e74c3c'
};

// Escala de cores para o mapa
const COLOR_SCALE = [
    '#FFF5E6', '#FFE4CC', '#FFD4A3', '#FFC080',
    '#FF9500', '#FF7F00', '#FF6500', '#FF4500'
];

// ================================
// PARÂMETROS SIRGAS 2000 / UTM 23S
// ================================
const SIRGAS_2000_UTM_23S = {
    epsg: 31983,
    datum: 'SIRGAS 2000',
    zone: 23,
    hemisphere: 'S',
    centralMeridian: -45.0,
    falseEasting: 500000,
    falseNorthing: 10000000,
    scaleFactor: 0.9996,
    ellipsoid: {
        a: 6378137.0,
        f: 1/298.257222101,
        b: 6356752.314140347
    },
    saoLuisBounds: {
        minX: 580000,
        maxX: 600000,
        minY: 9710000,
        maxY: 9730000
    },
    geoBounds: {
        north: -2.200,
        south: -2.800,
        east: -43.900,
        west: -44.600
    }
};

// ================================
// FUNÇÃO DE FORMATAÇÃO GLOBAL CORRIGIDA
// ================================
function formatNumber(numero, decimais = 2) {
    if (numero === null || numero === undefined || isNaN(numero)) {
        return decimais > 0 ? '0,00' : '0';
    }
    
    const valor = parseFloat(numero);
    if (isNaN(valor)) {
        return decimais > 0 ? '0,00' : '0';
    }
    
    return valor.toLocaleString('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais
    });
}

function formatarComoExcel(valor, decimais = 2) {
    return formatNumber(valor, decimais);
}

function getColorByValue(valor, minValue, maxValue) {
    if (maxValue === minValue) {
        return COLOR_SCALE[0];
    }
    const normalized = (valor - minValue) / (maxValue - minValue);
    const index = Math.floor(normalized * (COLOR_SCALE.length - 1));
    return COLOR_SCALE[Math.min(Math.max(index, 0), COLOR_SCALE.length - 1)];
}

function showMessage(message) {
    console.log(message);
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${message.includes('❌') ? '#e74c3c' : '#27ae60'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 400px;
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

// ================================
// FUNÇÕES DE CONVERSÃO SIRGAS 2000 CORRIGIDAS
// ================================
function convertSIRGAS2000UTMToWGS84(utmX, utmY) {
    try {
        if (!utmX || !utmY || isNaN(utmX) || isNaN(utmY)) {
            return null;
        }
        const a = SIRGAS_2000_UTM_23S.ellipsoid.a;
        const f = SIRGAS_2000_UTM_23S.ellipsoid.f;
        const k0 = SIRGAS_2000_UTM_23S.scaleFactor;
        const lon0 = SIRGAS_2000_UTM_23S.centralMeridian * Math.PI / 180;
        const FE = SIRGAS_2000_UTM_23S.falseEasting;
        const FN = SIRGAS_2000_UTM_23S.falseNorthing;
        const e2 = 2 * f - f * f;
        const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
        const x = utmX - FE;
        const y = utmY - FN;
        const M = y / k0;
        const mu = M / (a * (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256));
        const phi1 = mu + (3*e1/2 - 27*e1*e1*e1/32) * Math.sin(2*mu) +
                     (21*e1*e1/16 - 55*e1*e1*e1*e1/32) * Math.sin(4*mu) +
                     (151*e1*e1*e1/96) * Math.sin(6*mu);
        const C1 = e2 * Math.cos(phi1) * Math.cos(phi1);
        const T1 = Math.tan(phi1) * Math.tan(phi1);
        const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
        const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
        const D = x / (N1 * k0);
        const lat = phi1 - (N1 * Math.tan(phi1) / R1) *
                   (D*D/2 * (1 - D*D/12 * (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*e2)));
        const lon = lon0 + (D - D*D*D/6 * (1 + 2*T1 + C1)) / Math.cos(phi1);
        const latDeg = lat * 180 / Math.PI;
        const lonDeg = lon * 180 / Math.PI;
        const geoBounds = SIRGAS_2000_UTM_23S.geoBounds;
        if (latDeg < geoBounds.south || latDeg > geoBounds.north ||
            lonDeg < geoBounds.west || lonDeg > geoBounds.east) {
            return null;
        }
        return [latDeg, lonDeg];
    } catch (error) {
        console.error('❌ Erro na conversão SIRGAS 2000:', error);
        return null;
    }
}

function isValidSaoLuisCoordinate(lat, lng) {
    const bounds = SIRGAS_2000_UTM_23S.geoBounds;
    return lat >= bounds.south && lat <= bounds.north &&
           lng >= bounds.west && lng <= bounds.east;
}

// ================================
// CARREGAMENTO DE DADOS GEOJSON
// ================================
async function loadGeoJSON() {
    console.log('📍 === CARREGANDO GEOJSON ===');
    try {
        const response = await fetch('data/Dados_energia_solar.geojson');
        if (!response.ok) {
            throw new Error(`GeoJSON não encontrado: ${response.status}`);
        }
        const geoData = await response.json();
        console.log(`✅ GeoJSON carregado: ${geoData.features.length} features`);
        
        dadosGeoJSON = geoData.features.map((feature, index) => {
            const props = feature.properties;
            const objectId = extractObjectIdFromGeoJSON(props, index);
            return {
                id: objectId,
                coordinates: feature.geometry.coordinates,
                geometryType: feature.geometry.type,
                originalProperties: props
            };
        });
        console.log(`✅ Geometrias processadas: ${dadosGeoJSON.length} features`);
    } catch (error) {
        console.error('❌ Erro ao carregar GeoJSON:', error);
        throw error;
    }
}

// ================================
// CARREGAMENTO DE DADOS EXCEL OTIMIZADO
// ================================
async function loadExcelData() {
    console.log('📊 === CARREGANDO EXCEL (.xlsx) ===');
    
    const possiblePaths = [
        'data/Dados_energia_solar.xlsx',
        'Dados_energia_solar.xlsx',
        'data/dados_energia_solar.xlsx',
        'dados_energia_solar.xlsx'
    ];
    
    let foundPath = null;
    let response = null;
    
    for (const path of possiblePaths) {
        try {
            console.log(`🔍 Tentando carregar: ${path}`);
            response = await fetch(path);
            if (response.ok) {
                foundPath = path;
                console.log(`✅ Arquivo Excel encontrado em: ${foundPath}`);
                break;
            }
        } catch (error) {
            console.log(`❌ Erro ao tentar: ${path}`);
        }
    }
    
    if (!foundPath || !response.ok) {
        console.error('❌ Arquivo Excel não encontrado');
        throw new Error('Arquivo Excel não encontrado nos caminhos testados');
    }
    
    try {
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
            type: 'array',
            cellDates: true,
            cellStyles: true
        });
        
        const firstSheetName = workbook.SheetNames[0];
        console.log(`📋 Processando planilha: ${firstSheetName}`);
        
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Método otimizado de extração
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: true,
            defval: null
        });
        
        if (jsonData.length === 0) {
            throw new Error('❌ Planilha Excel está vazia');
        }
        
        console.log(`✅ Excel processado: ${jsonData.length} registros`);
        
        // Normalizar dados
        dadosExcel = jsonData.map(row => normalizeExcelData(row));
        console.log(`✅ Dados normalizados: ${dadosExcel.length} registros`);
        
        // DEBUG dos bairros AQUI
        console.log('🏘️ === ANÁLISE DE BAIRROS ===');
        const bairrosRaw = dadosExcel.map(item => item.bairro).filter(b => b);
        const bairrosUnicos = [...new Set(bairrosRaw)];
        console.log(`📊 Bairros únicos encontrados: ${bairrosUnicos.length}`);
        console.log('📊 Lista de bairros:', bairrosUnicos);
        
        if (dadosExcel.length > 0) {
            console.log('🔍 Primeiro registro normalizado:', dadosExcel[0]);
        }
        
    } catch (error) {
        console.error('❌ Erro ao processar Excel:', error);
        throw error;
    }
}

// ================================
// FUNÇÕES DE EXTRAÇÃO E NORMALIZAÇÃO CORRIGIDAS
// ================================
function extractObjectIdFromGeoJSON(props, index) {
    const possibleFields = [
        'OBJECTID', 'ObjectID', 'objectid', 'OBJECT_ID',
        'FID', 'FID_1', 'fid', 'ID', 'id'
    ];
    for (const field of possibleFields) {
        if (props.hasOwnProperty(field) && props[field] !== null && props[field] !== undefined) {
            const value = parseInt(props[field]);
            if (!isNaN(value)) {
                return value;
            }
        }
    }
    return index + 1;
}

function extractObjectIdFromExcel(row) {
    const possibleFields = [
        'OBJECTID', 'ObjectID', 'objectid', 'OBJECT_ID',
        'FID', 'FID_1', 'fid', 'ID', 'id'
    ];
    for (const field of possibleFields) {
        if (row.hasOwnProperty(field) && row[field] !== null && row[field] !== undefined && row[field] !== '') {
            const value = parseInt(String(row[field]));
            if (!isNaN(value)) {
                return value;
            }
        }
    }
    return null;
}

function normalizeExcelData(row) {
    const fieldMapping = {
        'OBJECTID': 'objectid',
        'Bairros': 'bairro',
        'Bairro': 'bairro',
        'Área em metros quadrados da edificação': 'area_edificacao',
        'Produção de energia kW do telhado do edifício': 'producao_telhado',
        'Capacidade de Produção de energia em kW por m²': 'capacidade_por_m2',
        'Quantidade de Radiação Máxima Solar nos mêses (kW.m²)': 'radiacao_max',
        'Quantidade de Placas Fotovoltaicas capaz de gerar a energia gerada do imóvel': 'quantidade_placas',
        'Capacidade de Produção de energia em Placas Fotovoltaicas em kW.h.dia': 'capacidade_placas_dia',
        'Capacidade de Produção de energia em Placas Fotovoltaicas em kW.h.mês': 'capacidade_placas_mes',
        'Potencial médio de geração FV em um dia (kW.dia.m²)': 'potencial_medio_dia',
        'Renda Total': 'renda_total',
        'Renda per capita': 'renda_per_capita',
        'Renda domiciliar per capita': 'renda_domiciliar_per_capita'
    };

    const normalized = {};
    
    // Mapear campos conhecidos
    Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = fieldMapping[key] || key.toLowerCase().replace(/\s+/g, '_');
        
        if (value !== null && value !== undefined && value !== '') {
            if (typeof value === 'string' && value.length > 0) {
                const cleanValue = value
                    .toString()
                    .replace(/\./g, '')
                    .replace(',', '.')
                    .replace(/[^\d.-]/g, '');
                const numValue = parseFloat(cleanValue);
                normalized[normalizedKey] = isNaN(numValue) ? value : numValue;
            } else if (typeof value === 'number') {
                normalized[normalizedKey] = value;
            } else {
                normalized[normalizedKey] = value;
            }
        } else {
            normalized[normalizedKey] = 0;
        }
    });
    
    // Garantir valores padrão para campos essenciais
    if (!normalized.quantidade_placas || normalized.quantidade_placas === 0) {
        if (normalized.area_edificacao && normalized.capacidade_por_m2) {
            const capacidadeTotal = normalized.area_edificacao * normalized.capacidade_por_m2;
            const potenciaPorPlaca = 0.45;
            normalized.quantidade_placas = Math.ceil(capacidadeTotal / potenciaPorPlaca);
        } else if (normalized.producao_telhado) {
            const potenciaPorPlaca = 0.45;
            normalized.quantidade_placas = Math.ceil(normalized.producao_telhado / potenciaPorPlaca);
        } else if (normalized.area_edificacao > 0) {
            normalized.quantidade_placas = Math.ceil(normalized.area_edificacao / 2);
        }
    }
    
    return normalized;
}

// ================================
// PROCESSAMENTO DE GEOMETRIA CORRIGIDO
// ================================
function processGeometrySIRGAS2000(geoItem) {
    try {
        const coords = geoItem.coordinates;
        const geomType = geoItem.geometryType;
        
        if (!coords || !Array.isArray(coords)) {
            return null;
        }
        
        let points = [];
        
        // Extrair pontos baseado no tipo de geometria
        if (geomType === 'Polygon' && coords[0]) {
            points = coords[0];
        } else if (geomType === 'MultiPolygon' && coords[0] && coords[0][0]) {
            points = coords[0][0];
        } else {
            return null;
        }
        
        if (!points || points.length === 0) {
            return null;
        }
        
        // Converter cada ponto de UTM para WGS84
        const convertedPoints = [];
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            if (!point || point.length < 2) {
                continue;
            }
            
            const converted = convertSIRGAS2000UTMToWGS84(point[0], point[1]);
            if (converted && converted.length === 2) {
                // CORREÇÃO CRÍTICA: Leaflet espera [lat, lng] para polígonos
                convertedPoints.push([converted[0], converted[1]]); // [lat, lng]
            }
        }
        
        if (convertedPoints.length === 0) {
            return null;
        }
        
        // Calcular centroide
        const centroid = calculateCentroid(convertedPoints);
        if (!centroid || !isValidSaoLuisCoordinate(centroid[0], centroid[1])) {
            return null;
        }
        
        return {
            coordinates: convertedPoints,
            centroid: centroid
        };
        
    } catch (error) {
        return null;
    }
}

function calculateCentroid(points) {
    if (!points || points.length === 0) return null;
    let sumLat = 0;
    let sumLng = 0;
    points.forEach(point => {
        sumLat += point[0];
        sumLng += point[1];
    });
    return [sumLat / points.length, sumLng / points.length];
}

// ================================
// VINCULAÇÃO DE DADOS CORRIGIDA
// ================================
async function linkDataReal() {
    console.log('🔗 === VINCULAÇÃO CORRIGIDA ===');
    if (!dadosGeoJSON || dadosGeoJSON.length === 0) {
        throw new Error('Dados GeoJSON não carregados');
    }
    if (!dadosExcel || dadosExcel.length === 0) {
        throw new Error('Dados Excel não carregados');
    }
    console.log(`📊 Vinculando ${dadosGeoJSON.length} geometrias com ${dadosExcel.length} registros Excel`);
    
    // Criar índice Excel
    const excelIndex = {};
    let excelIndexCount = 0;
    dadosExcel.forEach((row) => {
        const objectId = extractObjectIdFromExcel(row);
        if (objectId !== null) {
            excelIndex[objectId] = row;
            excelIndexCount++;
        }
    });
    console.log(`📋 Índice Excel criado: ${excelIndexCount} registros`);
    
    let sucessos = 0;
    let semDadosExcel = 0;
    let coordenadasInvalidas = 0;
    let foraDaRegiao = 0;
    let geometriaProcessada = 0;
    
    const dadosProcessados = [];
    
    for (let i = 0; i < dadosGeoJSON.length; i++) {
        const geo = dadosGeoJSON[i];
        
        try {
            const objectId = geo.id;
            const dadosExcelItem = excelIndex[objectId];
            
            const processedGeometry = processGeometrySIRGAS2000(geo);
            if (!processedGeometry) {
                coordenadasInvalidas++;
                continue;
            }
            
            geometriaProcessada++;
            
            if (!isValidSaoLuisCoordinate(processedGeometry.centroid[0], processedGeometry.centroid[1])) {
                foraDaRegiao++;
                continue;
            }
            
            const combinedItem = {
                id: objectId,
                coordinates: processedGeometry.coordinates,
                centroid: processedGeometry.centroid,
                geometryType: geo.geometryType,
                properties: combineProperties(geo, dadosExcelItem, objectId),
                originalGeoProps: geo.originalProperties,
                excelData: dadosExcelItem,
                isLinked: !!dadosExcelItem
            };
            
            // Verificar se dados são válidos para o mapa
            if (combinedItem.coordinates && 
                combinedItem.coordinates.length > 0 && 
                combinedItem.centroid && 
                combinedItem.centroid.length === 2) {
                
                dadosProcessados.push(combinedItem);
                
                if (dadosExcelItem) {
                    sucessos++;
                } else {
                    semDadosExcel++;
                }
            }
            
        } catch (error) {
            console.error(`❌ Erro no OBJECTID ${geo.id}:`, error);
            coordenadasInvalidas++;
        }
    }
    
    dadosCompletos = dadosProcessados;
    
    console.log('📊 === RESULTADO FINAL CORRIGIDO ===');
    console.log(`✅ Sucessos (com dados Excel): ${sucessos}`);
    console.log(`📍 Sem dados Excel: ${semDadosExcel}`);
    console.log(`🗺️ Fora de São Luís: ${foraDaRegiao}`);
    console.log(`❌ Coordenadas inválidas: ${coordenadasInvalidas}`);
    console.log(`🔧 Geometrias processadas: ${geometriaProcessada}`);
    console.log(`📈 Total válido para mapa: ${dadosCompletos.length}`);
    console.log(`📈 Taxa de vinculação: ${dadosCompletos.length > 0 ? ((sucessos / dadosCompletos.length) * 100).toFixed(1) : 0}%`);
    
    if (dadosCompletos.length === 0) {
        throw new Error('Nenhum dado válido após processamento');
    }
    
    // DEBUG dos primeiros itens processados
    if (dadosCompletos.length > 0) {
        console.log('🔍 === DEBUG PRIMEIROS ITENS PROCESSADOS ===');
        for (let i = 0; i < Math.min(3, dadosCompletos.length); i++) {
            const item = dadosCompletos[i];
            console.log(`Item ${i + 1} (ID ${item.id}):`);
            console.log(`  - Centroide: [${item.centroid[0].toFixed(6)}, ${item.centroid[1].toFixed(6)}]`);
            console.log(`  - Coordenadas: ${item.coordinates.length} pontos`);
            console.log(`  - Bairro: ${item.properties.bairro}`);
            console.log(`  - Área: ${item.properties.area_edificacao}`);
            console.log(`  - Vinculado ao Excel: ${item.isLinked}`);
        }
    }
    
    window.dadosCompletos = dadosCompletos;
    calcularEstatisticas();
    calcularEstatisticasPorBairro();
    updateSummaryCards();
    return dadosCompletos;
}

function combineProperties(geoItem, excelData, objectId) {
    const combined = {
        id: objectId,
        objectid: objectId,
        bairro: excelData?.bairro || 'Não informado',
        area_edificacao: excelData?.area_edificacao || 0,
        producao_telhado: excelData?.producao_telhado || 0,
        capacidade_por_m2: excelData?.capacidade_por_m2 || 0,
        radiacao_max: excelData?.radiacao_max || 0,
        quantidade_placas: excelData?.quantidade_placas || 0,
        capacidade_placas_dia: excelData?.capacidade_placas_dia || 0,
        capacidade_placas_mes: excelData?.capacidade_placas_mes || 0,
        potencial_medio_dia: excelData?.potencial_medio_dia || 0,
        renda_total: excelData?.renda_total || 0,
        renda_per_capita: excelData?.renda_per_capita || 0,
        renda_domiciliar_per_capita: excelData?.renda_domiciliar_per_capita || 0
    };
    
    return combined;
}

// ================================
// CÁLCULO DE ESTATÍSTICAS CORRIGIDO
// ================================
function calcularEstatisticas() {
    if (!dadosCompletos || dadosCompletos.length === 0) {
        console.log('⚠️ Nenhum dado disponível para calcular estatísticas');
        estatisticas = {
            total_imoveis: 0,
            producao_total: 0,
            media_producao: 0
        };
        return;
    }
    
    console.log(`📊 Calculando estatísticas para ${dadosCompletos.length} itens`);
    
    const totalImoveis = dadosCompletos.length;
    
    const producaoTotal = dadosCompletos.reduce((sum, item) => {
        if (item && item.properties && typeof item.properties.capacidade_placas_mes === 'number') {
            return sum + item.properties.capacidade_placas_mes;
        }
        return sum;
    }, 0);
    
    const mediaProducao = totalImoveis > 0 ? producaoTotal / totalImoveis : 0;
    
    estatisticas = {
        total_imoveis: totalImoveis,
        producao_total: producaoTotal,
        media_producao: mediaProducao
    };
    
    window.estatisticas = estatisticas;
    console.log('📊 Estatísticas globais calculadas:', estatisticas);
}

function calcularEstatisticasPorBairro() {
    if (!dadosCompletos || dadosCompletos.length === 0) {
        console.log('⚠️ Nenhum dado disponível para calcular estatísticas por bairro');
        estatisticasPorBairro = {};
        return;
    }
    
    const dadosPorBairro = {};
    
    dadosCompletos.forEach(item => {
        if (item && item.properties) {
            const bairro = item.properties.bairro || 'Não informado';
            if (!dadosPorBairro[bairro]) {
                dadosPorBairro[bairro] = [];
            }
            dadosPorBairro[bairro].push(item);
        }
    });
    
    estatisticasPorBairro = {};
    
    Object.entries(dadosPorBairro).forEach(([bairro, imoveis]) => {
        const totalImoveis = imoveis.length;
        
        const somaProducaoTelhado = imoveis.reduce((sum, item) => {
            if (item && item.properties && typeof item.properties.producao_telhado === 'number') {
                return sum + item.properties.producao_telhado;
            }
            return sum;
        }, 0);
        
        const somaRadiacaoMax = imoveis.reduce((sum, item) => {
            if (item && item.properties && typeof item.properties.radiacao_max === 'number') {
                return sum + item.properties.radiacao_max;
            }
            return sum;
        }, 0);
        
        const mediaProducaoTelhado = totalImoveis > 0 ? somaProducaoTelhado / totalImoveis : 0;
        const mediaRadiacaoMax = totalImoveis > 0 ? somaRadiacaoMax / totalImoveis : 0;
        
        const mediaProducaoMensal = generateMonthlyAverages(mediaProducaoTelhado);
        const mediaRadiacaoMensal = generateMonthlyAverages(mediaRadiacaoMax);
        
        estatisticasPorBairro[bairro] = {
            total_imoveis: totalImoveis,
            media_producao_mensal: mediaProducaoMensal,
            media_radiacao_mensal: mediaRadiacaoMensal
        };
    });
    
    window.estatisticasPorBairro = estatisticasPorBairro;
    console.log('📊 Estatísticas por bairro calculadas:', Object.keys(estatisticasPorBairro).length, 'bairros');
}

function generateMonthlyAverages(baseValue) {
    if (!baseValue || baseValue === 0) {
        return new Array(12).fill(0);
    }
    
    const seasonalFactors = [1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
    
    return seasonalFactors.map(factor => {
        return (baseValue / 12) * factor;
    });
}

function updateSummaryCards() {
    const dados = filtrarDados();
    const totalEl = document.getElementById('total-imoveis-display');
    const producaoEl = document.getElementById('producao-total-display');
    const mediaEl = document.getElementById('media-imovel-display');
    
    if (totalEl) {
        totalEl.textContent = dados.length.toLocaleString('pt-BR');
    }
    if (producaoEl) {
        const total = dados.reduce((sum, item) => {
            return sum + (item.properties?.capacidade_placas_mes || 0);
        }, 0);
        producaoEl.textContent = formatNumber(total, 0);
    }
    if (mediaEl) {
        const total = dados.reduce((sum, item) => {
            return sum + (item.properties?.capacidade_placas_mes || 0);
        }, 0);
        const media = dados.length > 0 ? total / dados.length : 0;
        mediaEl.textContent = formatNumber(media, 2);
    }
}

function filtrarDados() {
    return dadosCompletos.filter(item => {
        if (!item || !item.properties) return false;
        
        const props = item.properties;
        if (filtrosAtivos.bairros.length > 0) {
            if (!filtrosAtivos.bairros.includes(props.bairro)) {
                return false;
            }
        }
        const valor = props[filtrosAtivos.info] || 0;
        if (filtrosAtivos.minValue !== null && valor < filtrosAtivos.minValue) {
            return false;
        }
        if (filtrosAtivos.maxValue !== null && valor > filtrosAtivos.maxValue) {
            return false;
        }
        return true;
    });
}

function selecionarImovel(imovelId) {
    const imovel = dadosCompletos.find(item => item.id === imovelId);
    if (imovel) {
        imovelSelecionado = imovel;
        updateInfoCards(imovel);
        updateRelatorio(imovel);
        updateCharts(imovel);
        console.log(`✅ Imóvel ${imovelId} selecionado do bairro: ${imovel.properties.bairro}`);
        console.log('📊 Dados vinculados:', imovel.isLinked ? 'SIM' : 'NÃO');
        if (window.centerOnImovel) {
            window.centerOnImovel(imovelId);
        }
    }
}

function updateInfoCards(imovel = null) {
    const elementos = {
        'area-edificacao-display': imovel ? (imovel.properties.area_edificacao || 0) : 0,
        'radiacao-max-display': imovel ? (imovel.properties.radiacao_max || 0) : 0,
        'capacidade-por-m2-display': imovel ? (imovel.properties.capacidade_por_m2 || 0) : 0,
        'producao-telhado-display': imovel ? (imovel.properties.producao_telhado || 0) : 0,
        'capacidade-placas-dia-display': imovel ? (imovel.properties.capacidade_placas_dia || 0) : 0,
        'capacidade-placas-mes-display': imovel ? (imovel.properties.capacidade_placas_mes || 0) : 0,
        'quantidade-placas-display': imovel ? (imovel.properties.quantidade_placas || 0) : 0,
        'potencial-medio-dia-display': imovel ? (imovel.properties.potencial_medio_dia || 0) : 0,
        'renda-total-display': imovel ? (imovel.properties.renda_total || 0) : 0,
        'renda-per-capita-display': imovel ? (imovel.properties.renda_per_capita || 0) : 0,
        'renda-domiciliar-per-capita-display': imovel ? (imovel.properties.renda_domiciliar_per_capita || 0) : 0
    };
    
    Object.entries(elementos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (id.includes('quantidade')) {
                elemento.textContent = formatNumber(valor, 0);
            } else {
                elemento.textContent = formatNumber(valor, 2);
            }
        }
    });
    
    if (imovel && imovel.isLinked) {
        console.log(`✅ Cards atualizados para imóvel ${imovel.id} com dados Excel`);
    }
}

function updateRelatorio(imovel = null) {
    const tituloEl = document.getElementById('relatorio-titulo');
    const conteudoEl = document.getElementById('relatorio-conteudo');
    if (!tituloEl || !conteudoEl) return;
    
    if (imovel) {
        const props = imovel.properties;
        tituloEl.textContent = `📊 Relatório - Imóvel ${imovel.id}`;
        
        const textoRelatorio = `O imóvel selecionado no Bairro ${props.bairro}, localizado nas coordenadas (${imovel.centroid[0].toFixed(6)}, ${imovel.centroid[1].toFixed(6)}), possui ${formatNumber(props.area_edificacao, 2)} m², com Quantidade de Radiação Máxima Solar nos 12 meses do ano de ${formatNumber(props.radiacao_max, 2)} kW/m², apresentando uma Capacidade de Produção de energia de ${formatNumber(props.capacidade_por_m2, 2)} kW por m², com produção diária de ${formatNumber(props.capacidade_placas_dia, 2)} kWh e produção média mensal de ${formatNumber(props.capacidade_placas_mes, 2)} kWh. Para essa produção estima-se a necessidade de ${formatNumber(props.quantidade_placas, 0)} placas fotovoltaicas. O imóvel apresenta um potencial médio de geração de ${formatNumber(props.potencial_medio_dia, 2)} kW.dia/m² e está localizado em uma região com renda total de R$ ${formatNumber(props.renda_total, 2)}, renda per capita de R$ ${formatNumber(props.renda_per_capita, 2)} e renda domiciliar per capita de R$ ${formatNumber(props.renda_domiciliar_per_capita, 2)}.`;
        
        conteudoEl.innerHTML = `<p style="text-align: justify; line-height: 1.6;">${textoRelatorio}</p>`;
    } else {
        tituloEl.textContent = '📊 Relatório do Imóvel';
        conteudoEl.innerHTML = `
            <p>Selecione um imóvel no mapa para ver o relatório detalhado.</p>
            <p><strong>Sistema FINAL CORRIGIDO:</strong></p>
            <ul>
                <li>✅ Lê arquivos Excel (.xlsx) diretamente</li>
                <li>✅ Vinculação de dados funcionando</li>
                <li>✅ Coordenadas convertidas corretamente</li>
                <li>✅ Polígonos exibidos no mapa</li>
                <li>✅ Filtros de bairros funcionando</li>
            </ul>
        `;
    }
}

function initializeCharts() {
    console.log('📊 Charts inicializados');
    if (window.initializeCharts && typeof window.initializeCharts === 'function') {
        try {
            window.initializeCharts();
        } catch (error) {
            console.error('❌ Erro ao inicializar charts:', error);
        }
    }
}

function initializeFilters() {
    console.log('🔍 Filtros inicializados');
    if (window.initializeFilters && typeof window.initializeFilters === 'function') {
        try {
            window.initializeFilters();
        } catch (error) {
            console.error('❌ Erro ao inicializar filtros:', error);
        }
    }
}

function initializeEvents() {
    console.log('🎯 Eventos inicializados');
    const btnPdf = document.getElementById('btn-gerar-pdf');
    if (btnPdf) {
        btnPdf.addEventListener('click', function() {
            const instructions = document.getElementById('pdf-instructions');
            if (instructions) {
                instructions.style.display = instructions.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            diagnosticDataDetailed();
        }
        if (e.key === 'Escape') {
            if (window.clearSelection) {
                window.clearSelection();
            }
            imovelSelecionado = null;
            updateInfoCards();
            updateRelatorio();
            updateCharts();
        }
    });
}

function updateCharts(imovel = null) {
    if (window.updateCharts && typeof window.updateCharts === 'function') {
        try {
            window.updateCharts(imovel);
        } catch (error) {
            console.error('❌ Erro ao atualizar charts:', error);
        }
    }
}

function diagnosticDataDetailed() {
    console.log('🔍 === DIAGNÓSTICO SIMPLIFICADO ===');
    if (dadosGeoJSON && dadosGeoJSON.length > 0) {
        console.log(`📍 GeoJSON: ${dadosGeoJSON.length} features`);
        const objectIds = dadosGeoJSON.map(item => item.id).slice(0, 5);
        console.log(`📋 Primeiros 5 OBJECTIDs GeoJSON:`, objectIds);
    }
    if (dadosExcel && dadosExcel.length > 0) {
        console.log(`📊 Excel: ${dadosExcel.length} registros`);
        const objectIds = dadosExcel.map(row => extractObjectIdFromExcel(row)).filter(id => id !== null).slice(0, 5);
        console.log(`📋 Primeiros 5 OBJECTIDs Excel:`, objectIds);
        console.log(`📋 Campos disponíveis:`, Object.keys(dadosExcel[0] || {}));
        
        // Análise específica de bairros
        const bairros = dadosExcel.map(item => item.bairro).filter(b => b);
        const bairrosUnicos = [...new Set(bairros)];
        console.log(`🏘️ Bairros únicos: ${bairrosUnicos.length}`);
        console.log(`🏘️ Lista completa:`, bairrosUnicos);
    }
    if (dadosCompletos && dadosCompletos.length > 0) {
        console.log(`🔗 Dados Completos: ${dadosCompletos.length} itens`);
        const vinculados = dadosCompletos.filter(item => item.isLinked).length;
        console.log(`✅ Itens com dados Excel: ${vinculados}`);
        console.log(`📈 Taxa de vinculação: ${((vinculados / dadosCompletos.length) * 100).toFixed(1)}%`);
        
        // Verificar coordenadas válidas
        const coordsValidas = dadosCompletos.filter(item => 
            item.coordinates && item.coordinates.length > 0 && 
            item.centroid && item.centroid.length === 2
        ).length;
        console.log(`📍 Itens com coordenadas válidas: ${coordsValidas}`);
        
        // Verificar bairros nos dados completos
        const bairrosCompletos = [...new Set(dadosCompletos.map(item => item.properties?.bairro).filter(b => b))];
        console.log(`🏘️ Bairros nos dados completos: ${bairrosCompletos.length}`);
        console.log(`🏘️ Lista:`, bairrosCompletos);
    }
}

// ================================
// INICIALIZAÇÃO PRINCIPAL CORRIGIDA
// ================================
async function initializeDashboard() {
    console.log('📊 === SOLARMAP - VERSÃO FINAL CORRIGIDA ===');
    try {
        if (window.location.protocol === 'file:') {
            console.error('❌ Use Live Server!');
            showMessage('❌ Use Live Server!');
            return;
        }
        
        console.log('✅ Live Server detectado');
        console.log('📍 1/6 - Carregando GeoJSON...');
        await loadGeoJSON();
        
        console.log('📊 2/6 - Carregando Excel...');
        await loadExcelData();
        
        console.log('🔍 3/6 - Diagnóstico...');
        diagnosticDataDetailed();
        
        console.log('🔗 4/6 - Vinculação...');
        await linkDataReal();
        
        console.log('🗺️ 5/6 - Criando mapa...');
        await initMapAndWait();
        
        console.log('📍 6/6 - Adicionando polígonos...');
        await addPolygonsAndWait();
        
        initializeCharts();
        initializeFilters();
        initializeEvents();
        
        // NOVO: Atualizar filtros após carregamento completo
        if (window.populateBairroSelect) {
            window.populateBairroSelect();
        }
        
        console.log('✅ Dashboard FINAL CORRIGIDO inicializado!');
        showMessage('✅ SolarMap Final Corrigido carregado com sucesso!');
        
        // DEBUG final
        console.log('🔍 === VERIFICAÇÃO FINAL ===');
        console.log(`📊 Dados carregados: ${dadosCompletos.length} itens`);
        console.log(`🗺️ Polígonos no mapa: ${window.layerGroup?.getLayers().length || 0}`);
        console.log(`🏘️ Bairros disponíveis: ${Object.keys(estatisticasPorBairro).length}`);
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showMessage(`❌ Erro: ${error.message}`);
    }
}

async function initMapAndWait() {
    return new Promise((resolve, reject) => {
        try {
            if (typeof window.initMap === 'function') {
                window.initMap();
                const checkMap = setInterval(() => {
                    if (window.mapInstance && window.layerGroup) {
                        console.log('✅ Mapa pronto!');
                        clearInterval(checkMap);
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(checkMap);
                    if (!window.mapInstance) {
                        reject(new Error('Timeout: Mapa não criado'));
                    }
                }, 5000);
            } else {
                reject(new Error('Função initMap não encontrada'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

async function addPolygonsAndWait() {
    return new Promise((resolve, reject) => {
        try {
            if (typeof window.addPolygonsToMap === 'function') {
                window.addPolygonsToMap();
                let attempts = 0;
                const maxAttempts = 60;
                const checkProgress = setInterval(() => {
                    attempts++;
                    const polygonCount = window.layerGroup?.getLayers().length || 0;
                    if (polygonCount > 0) {
                        console.log(`✅ Polígonos adicionados: ${polygonCount}`);
                        clearInterval(checkProgress);
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        console.warn('⚠️ Timeout ao aguardar polígonos, mas continuando...');
                        clearInterval(checkProgress);
                        resolve(); // Não rejeitar, apenas continuar
                    }
                }, 500);
            } else {
                reject(new Error('Função addPolygonsToMap não encontrada'));
            }
        } catch (error) {
            console.warn('⚠️ Erro ao adicionar polígonos, mas continuando:', error);
            resolve(); // Não rejeitar, apenas continuar
        }
    });
}

function getMediaDoBairro(bairro) {
    return estatisticasPorBairro[bairro] || {
        media_producao_mensal: new Array(12).fill(0),
        media_radiacao_mensal: new Array(12).fill(0)
    };
}

// ================================
// EXPORTAÇÕES GLOBAIS
// ================================
window.initializeDashboard = initializeDashboard;
window.dadosCompletos = dadosCompletos;
window.dadosExcel = dadosExcel;
window.dadosGeoJSON = dadosGeoJSON;
window.filtrarDados = filtrarDados;
window.selecionarImovel = selecionarImovel;
window.updateSummaryCards = updateSummaryCards;
window.filtrosAtivos = filtrosAtivos;
window.estatisticas = estatisticas;
window.estatisticasPorBairro = estatisticasPorBairro;
window.imovelSelecionado = imovelSelecionado;
window.CORES = CORES;
window.COLOR_SCALE = COLOR_SCALE;
window.formatNumber = formatNumber;
window.getColorByValue = getColorByValue;
window.diagnosticDataDetailed = diagnosticDataDetailed;
window.convertSIRGAS2000UTMToWGS84 = convertSIRGAS2000UTMToWGS84;
window.SIRGAS_2000_UTM_23S = SIRGAS_2000_UTM_23S;
window.isValidSaoLuisCoordinate = isValidSaoLuisCoordinate;
window.normalizeExcelData = normalizeExcelData;
window.calcularEstatisticasPorBairro = calcularEstatisticasPorBairro;
window.getMediaDoBairro = getMediaDoBairro;
window.formatarComoExcel = formatarComoExcel;
window.generateMonthlyAverages = generateMonthlyAverages;
window.processGeometrySIRGAS2000 = processGeometrySIRGAS2000;
window.linkDataReal = linkDataReal;

console.log('✅ DASHBOARD FINAL CORRIGIDO COMPLETO CARREGADO!');
