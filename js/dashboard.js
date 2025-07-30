// ================================
// DASHBOARD PRINCIPAL - SOLARMAP
// VERSÃO QUE LÊ EXCEL EXATAMENTE COMO ESTÁ
// ================================
console.log('🚀 Dashboard SolarMap - LEITURA EXATA DO EXCEL');

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
    '#DAA520', '#FF8C00', '#FF7F00', '#FF6500',  // Amarelo queimado → Laranja
    '#FF4500', '#FF2500', '#FF0000', '#DC143C'   // Laranja → Vermelho vivo
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
// FUNÇÃO DE FORMATAÇÃO BRASILEIRA MANUAL (GARANTIDA)
// ================================
function formatNumber(numero, decimais = 2) {
    if (numero === null || numero === undefined || numero === '' || isNaN(numero)) {
        return decimais > 0 ? '0,00' : '0';
    }
    
    let valor = numero;
    
    // Se for string, converter para número
    if (typeof numero === 'string') {
        valor = converterParaNumero(numero);
        if (isNaN(valor)) {
            return numero; // Retornar string original se não conseguir converter
        }
    }
    
    // FORMATAÇÃO BRASILEIRA MANUAL
    const valorFixo = parseFloat(valor).toFixed(decimais);
    const [parteInteira, parteDecimal] = valorFixo.split('.');
    
    // Adicionar pontos a cada 3 dígitos da direita para a esquerda
    const inteiraFormatada = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // Retornar no formato brasileiro: 1.234,56
    if (decimais > 0) {
        return inteiraFormatada + ',' + parteDecimal;
    } else {
        return inteiraFormatada;
    }
}

// Função auxiliar para teste
function testarFormatacao() {
    console.log('🧪 === TESTE DE FORMATAÇÃO BRASILEIRA ===');
    console.log('7028 →', formatNumber(7028, 2));           // Deve dar: 7.028,00
    console.log('1234567 →', formatNumber(1234567, 2));     // Deve dar: 1.234.567,00  
    console.log('848 →', formatNumber(848, 2));             // Deve dar: 848,00
    console.log('7028.5 →', formatNumber(7028.5, 2));       // Deve dar: 7.028,50
    console.log('0 →', formatNumber(0, 2));                 // Deve dar: 0,00
}

// NOVA: Função para converter strings brasileiras em números
function converterParaNumero(valor) {
    if (typeof valor === 'number') {
        return valor;
    }
    
    if (typeof valor !== 'string') {
        return 0;
    }
    
    // Remover espaços
    let limpo = valor.toString().trim();
    
    // FORMATO BRASILEIRO: 1.234.567,89
    if (limpo.includes('.') && limpo.includes(',')) {
        // Pontos são separadores de milhar, vírgula é decimal
        limpo = limpo.replace(/\./g, '').replace(',', '.');
    }
    // Se tem só vírgula: 1234,56 → 1234.56
    else if (limpo.includes(',') && !limpo.includes('.')) {
        limpo = limpo.replace(',', '.');
    }
    // Se tem só pontos, verificar se é milhar ou decimal
    else if (limpo.includes('.')) {
        const pontos = (limpo.match(/\./g) || []).length;
        if (pontos > 1) {
            // Múltiplos pontos = separadores de milhar
            limpo = limpo.replace(/\./g, '');
        } else {
            // Um ponto pode ser milhar (7.028) ou decimal (7.28)
            // Se tem 3 dígitos após o ponto, é milhar
            if (limpo.match(/\.\d{3}$/)) {
                limpo = limpo.replace('.', '');
            }
            // Senão, manter como decimal
        }
    }
    
    const numero = parseFloat(limpo);
    return isNaN(numero) ? 0 : numero;
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
// FUNÇÕES DE CONVERSÃO SIRGAS 2000
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
// NOVO: CARREGAMENTO DE DADOS EXCEL PRESERVANDO FORMATO ORIGINAL
// ================================
async function loadExcelData() {
    console.log('📊 === CARREGANDO EXCEL PRESERVANDO FORMATO ORIGINAL ===');
    try {
        const response = await fetch('data/Dados_energia_solar.xlsx');
        if (!response.ok) {
            throw new Error(`❌ Arquivo Excel não encontrado! Status: ${response.status}`);
        }
        
        console.log('✅ Arquivo Excel encontrado, processando...');
        const arrayBuffer = await response.arrayBuffer();
        
        // Usar SheetJS com configurações para preservar formato original
        const workbook = XLSX.read(arrayBuffer, {
            type: 'array',
            cellDates: false,      // Não converter datas automaticamente
            cellStyles: true,      // Manter estilos
            cellFormulas: false,   // Não processar fórmulas
            raw: false,           // NÃO converter valores - manter como string
            dateNF: 'dd/mm/yyyy'  // Formato de data brasileiro
        });
        
        const firstSheetName = workbook.SheetNames[0];
        console.log(`📋 Processando planilha: ${firstSheetName}`);
        
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converter para JSON mantendo formato original
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',           // Valor padrão para células vazias
            raw: false,          // IMPORTANTE: Manter formatação original
            dateNF: 'dd/mm/yyyy'
        });
        
        if (jsonData.length === 0) {
            throw new Error('❌ Planilha Excel está vazia');
        }
        
        // Primeira linha são os headers
        const headers = jsonData[0];
        console.log(`📋 Headers encontrados (${headers.length}):`, headers.slice(0, 10), '...');
        
        // Converter dados em objetos PRESERVANDO FORMATO ORIGINAL
        const dataObjects = [];
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const obj = {};
            
            headers.forEach((header, index) => {
                if (header && header.toString().trim()) {
                    const valor = row[index];
                    
                    // PRESERVAR VALOR EXATAMENTE COMO ESTÁ NO EXCEL
                    if (valor !== null && valor !== undefined && valor !== '') {
                        obj[header.toString().trim()] = valor; // Manter valor original
                    } else {
                        obj[header.toString().trim()] = '';
                    }
                }
            });
            
            if (Object.keys(obj).length > 0) {
                dataObjects.push(obj);
            }
        }
        
        console.log(`✅ Excel processado: ${dataObjects.length} registros`);
        
        // DEBUG: Mostrar primeiro registro com valores originais
        if (dataObjects.length > 0) {
            console.log('🔍 Primeiro registro do Excel (valores originais):');
            const exemplo = dataObjects[0];
            Object.entries(exemplo).slice(0, 10).forEach(([campo, valor]) => {
                console.log(`  ${campo}: "${valor}" (tipo: ${typeof valor})`);
            });
        }
        
        // Normalizar dados PRESERVANDO valores originais
        dadosExcel = dataObjects.map(row => normalizeExcelDataPreservandoOriginal(row));
        console.log(`✅ Dados normalizados: ${dadosExcel.length} registros`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar Excel:', error);
        throw error;
    }
}

// ================================
// NOVA: Normalização que PRESERVA valores originais do Excel MAS TRATA NÚMEROS
// ================================
function normalizeExcelDataPreservandoOriginal(row) {
    const normalized = {};
    
    // Processar cada campo do Excel
    Object.entries(row).forEach(([campo, valor]) => {
        const campoLimpo = campo.toString().trim();
        
        // Criar chave normalizada
        const chaveNormalizada = campoLimpo.toLowerCase()
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõöø]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[ç]/g, 'c')
            .replace(/[ñ]/g, 'n')
            .replace(/\s+/g, '_')
            .replace(/[^\w]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        
        // PRESERVAR valor original como string para exibição
        normalized[chaveNormalizada] = valor;
        normalized[campoLimpo] = valor;
        
        // CRIAR versão numérica para cálculos do mapa
        if (valor && typeof valor === 'string') {
            const valorNumerico = converterParaNumero(valor);
            if (!isNaN(valorNumerico)) {
                normalized[chaveNormalizada + '_numerico'] = valorNumerico;
            }
        } else if (typeof valor === 'number') {
            normalized[chaveNormalizada + '_numerico'] = valor;
        }
    });
    
    return normalized;
}

// NOVA: Função para converter strings brasileiras em números
function converterParaNumero(valor) {
    if (typeof valor === 'number') {
        return valor;
    }
    
    if (typeof valor !== 'string') {
        return 0;
    }
    
    // Remover espaços e caracteres não numéricos (exceto . , -)
    let limpo = valor.toString().trim();
    
    // Se tem pontos E vírgulas (formato brasileiro: 1.234,56)
    if (limpo.includes('.') && limpo.includes(',')) {
        // Remover pontos (separadores de milhar) e trocar vírgula por ponto
        limpo = limpo.replace(/\./g, '').replace(',', '.');
    }
    // Se tem só vírgula (formato: 1234,56)
    else if (limpo.includes(',') && !limpo.includes('.')) {
        limpo = limpo.replace(',', '.');
    }
    // Se tem só pontos (pode ser milhar ou decimal)
    else if (limpo.includes('.')) {
        // Se tem mais de um ponto, são separadores de milhar
        const pontos = (limpo.match(/\./g) || []).length;
        if (pontos > 1) {
            limpo = limpo.replace(/\./g, '');
        }
        // Se tem só um ponto e 3 dígitos depois, é separador de milhar
        else if (limpo.match(/\.\d{3}$/)) {
            limpo = limpo.replace('.', '');
        }
        // Senão, considera como decimal
    }
    
    const numero = parseFloat(limpo);
    return isNaN(numero) ? 0 : numero;
}

// ================================
// FUNÇÕES DE EXTRAÇÃO DE DADOS
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

// ================================
// CONTINUA COM RESTO DAS FUNÇÕES...
// ================================
async function linkDataReal() {
    console.log('🔗 === VINCULAÇÃO REAL PRESERVANDO DADOS ORIGINAIS ===');
    if (!dadosGeoJSON || dadosGeoJSON.length === 0) {
        throw new Error('Dados GeoJSON não carregados');
    }
    if (!dadosExcel || dadosExcel.length === 0) {
        throw new Error('Dados Excel não carregados');
    }
    console.log(`📊 Vinculando ${dadosGeoJSON.length} geometrias com ${dadosExcel.length} registros Excel`);
    
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
    
    dadosCompletos = dadosGeoJSON.map((geo) => {
        try {
            const objectId = geo.id;
            const dadosExcel = excelIndex[objectId];
            if (!dadosExcel) {
                semDadosExcel++;
            }
            const processedGeometry = processGeometrySIRGAS2000(geo);
            if (!processedGeometry) {
                coordenadasInvalidas++;
                return null;
            }
            if (!isValidSaoLuisCoordinate(processedGeometry.centroid[0], processedGeometry.centroid[1])) {
                foraDaRegiao++;
                return null;
            }
            const combinedItem = {
                id: objectId,
                coordinates: processedGeometry.coordinates,
                centroid: processedGeometry.centroid,
                geometryType: geo.geometryType,
                properties: combinePropertiesPreservandoOriginal(geo, dadosExcel, objectId),
                originalGeoProps: geo.originalProperties,
                excelData: dadosExcel,
                isLinked: !!dadosExcel
            };
            if (dadosExcel) {
                sucessos++;
            }
            return combinedItem;
        } catch (error) {
            console.error(`❌ Erro no OBJECTID ${geo.id}:`, error);
            coordenadasInvalidas++;
            return null;
        }
    }).filter(item => item !== null);
    
    console.log('📊 === RESULTADO FINAL ===');
    console.log(`✅ Sucessos (com dados Excel): ${sucessos}`);
    console.log(`📍 Sem dados Excel: ${semDadosExcel}`);
    console.log(`🗺️ Fora de São Luís: ${foraDaRegiao}`);
    console.log(`❌ Coordenadas inválidas: ${coordenadasInvalidas}`);
    console.log(`📈 Total válido: ${dadosCompletos.length}`);
    
    if (dadosCompletos.length === 0) {
        throw new Error('Nenhum dado válido após processamento');
    }
    if (sucessos > 0) {
        console.log(`✅ Vinculação bem-sucedida: ${sucessos} imóveis`);
        showMessage(`✅ Vinculação: ${sucessos} imóveis com dados Excel`);
        
        // Atualizar filtros após carregar dados
        if (window.updateFiltersOnDataChange) {
            window.updateFiltersOnDataChange();
        }
    }
    window.dadosCompletos = dadosCompletos;
    calcularEstatisticas();
    calcularEstatisticasPorBairro();
    updateSummaryCards();
    return dadosCompletos;
}

function combinePropertiesPreservandoOriginal(geoItem, excelData, objectId) {
    if (!excelData) {
        return {
            id: objectId,
            objectid: objectId,
            bairro: 'Não informado'
        };
    }
    
    // Preservar TODOS os dados originais do Excel
    const combined = { ...excelData };
    
    // Adicionar campos essenciais
    combined.id = objectId;
    combined.objectid = objectId;
    
    // Mapear campos específicos mantendo valores originais E numéricos
    if (excelData['Bairros']) {
        combined.bairro = excelData['Bairros'];
    }
    
    // NOVO: Mapear campos específicos para o mapa com valores numéricos
    const mapearCampoNumerico = (termosChave, nomeCampo) => {
        for (const termo of termosChave) {
            for (const [campo, valor] of Object.entries(excelData)) {
                if (campo.toLowerCase().includes(termo.toLowerCase())) {
                    // Valor original para exibição
                    combined[nomeCampo] = valor;
                    // Valor numérico para cálculos
                    const valorNumerico = converterParaNumero(valor);
                    combined[nomeCampo + '_numerico'] = valorNumerico;
                    console.log(`✅ Mapeado ${nomeCampo}: "${valor}" → ${valorNumerico}`);
                    return;
                }
            }
        }
        combined[nomeCampo] = '';
        combined[nomeCampo + '_numerico'] = 0;
    };
    
    // Mapear campos específicos
    mapearCampoNumerico(['produção de energia kw do telhado'], 'producao_telhado');
    mapearCampoNumerico(['capacidade de produção de energia em kw por m²', 'capacidade.*m²'], 'capacidade_por_m2');
    mapearCampoNumerico(['área em metros quadrados'], 'area_edificacao');
    mapearCampoNumerico(['quantidade de radiação máxima solar'], 'radiacao_max');
    mapearCampoNumerico(['quantidade de placas fotovoltaicas'], 'quantidade_placas');
    mapearCampoNumerico(['renda total'], 'renda_total');
    mapearCampoNumerico(['renda per capita'], 'renda_per_capita');
    mapearCampoNumerico(['renda domiciliar per capita'], 'renda_domiciliar_per_capita');
    
    return combined;
}

function processGeometrySIRGAS2000(geoItem) {
    try {
        const coords = geoItem.coordinates;
        const geomType = geoItem.geometryType;
        if (!coords || !Array.isArray(coords)) {
            return null;
        }
        let points = [];
        if (geomType === 'Polygon' && coords[0]) {
            points = coords[0];
        } else if (geomType === 'MultiPolygon' && coords[0] && coords[0][0]) {
            points = coords[0][0];
        }
        if (!points || points.length === 0) {
            return null;
        }
        const convertedPoints = points.map(point => {
            if (!point || point.length < 2) return null;
            return convertSIRGAS2000UTMToWGS84(point[0], point[1]);
        }).filter(point => point !== null);
        if (convertedPoints.length === 0) {
            return null;
        }
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

function calcularEstatisticas() {
    if (dadosCompletos.length === 0) return;
    const totalImoveis = dadosCompletos.length;
    
    estatisticas = {
        total_imoveis: totalImoveis
    };
    window.estatisticas = estatisticas;
    console.log('📊 Estatísticas globais calculadas:', estatisticas);
}

function calcularEstatisticasPorBairro() {
    if (dadosCompletos.length === 0) return;
    
    const dadosPorBairro = {};
    
    dadosCompletos.forEach(item => {
        const bairro = item.properties.bairro || item.properties['Bairros'] || 'Não informado';
        if (!dadosPorBairro[bairro]) {
            dadosPorBairro[bairro] = [];
        }
        dadosPorBairro[bairro].push(item);
    });
    
    estatisticasPorBairro = {};
    
    Object.entries(dadosPorBairro).forEach(([bairro, imoveis]) => {
        estatisticasPorBairro[bairro] = {
            total_imoveis: imoveis.length
        };
    });
    
    window.estatisticasPorBairro = estatisticasPorBairro;
    console.log('📊 Estatísticas por bairro calculadas:', estatisticasPorBairro);
}

function updateSummaryCards() {
    const dados = filtrarDados();
    const totalEl = document.getElementById('total-imoveis-display');
    
    if (totalEl) {
        totalEl.textContent = dados.length.toLocaleString('pt-BR');
    }
}

function filtrarDados() {
    return dadosCompletos.filter(item => {
        const props = item.properties;
        if (filtrosAtivos.bairros.length > 0) {
            const bairro = props.bairro || props['Bairros'] || 'Não informado';
            if (!filtrosAtivos.bairros.includes(bairro)) {
                return false;
            }
        }
        
        // CORRIGIDO: Usar valores numéricos para filtros
        if (filtrosAtivos.info && (filtrosAtivos.minValue !== null || filtrosAtivos.maxValue !== null)) {
            const valorNumerico = props[filtrosAtivos.info + '_numerico'] || 0;
            
            if (filtrosAtivos.minValue !== null && valorNumerico < filtrosAtivos.minValue) {
                return false;
            }
            if (filtrosAtivos.maxValue !== null && valorNumerico > filtrosAtivos.maxValue) {
                return false;
            }
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
        console.log(`✅ Imóvel ${imovelId} selecionado`);
        console.log('📊 Dados Excel originais:', imovel.excelData);
        if (window.centerOnImovel) {
            window.centerOnImovel(imovelId);
        }
    }
}

// CARDS DE INFORMAÇÕES - FORMATAÇÃO BRASILEIRA CORRETA
function updateInfoCards(imovel = null) {
    if (!imovel || !imovel.excelData) {
        // Limpar cards se não houver dados
        const elementos = [
            'area-edificacao-display', 'radiacao-max-display', 'capacidade-por-m2-display',
            'producao-telhado-display', 'capacidade-placas-dia-display', 'capacidade-placas-mes-display',
            'quantidade-placas-display', 'potencial-medio-dia-display', 'renda-total-display',
            'renda-per-capita-display', 'renda-domiciliar-per-capita-display'
        ];
        
        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = '0,00';
            }
        });
        return;
    }
    
    const dados = imovel.excelData;
    
    console.log('🔍 === DADOS ORIGINAIS DO EXCEL ===');
    console.log('Todos os campos disponíveis:');
    Object.entries(dados).forEach(([campo, valor]) => {
        console.log(`  ${campo}: "${valor}"`);
    });
    
    // Buscar campos específicos EXATAMENTE como estão no Excel
    const buscarCampo = (termosChave) => {
        for (const termo of termosChave) {
            for (const [campo, valor] of Object.entries(dados)) {
                if (campo.toLowerCase().includes(termo.toLowerCase())) {
                    console.log(`✅ Encontrado campo "${campo}" para termo "${termo}": ${valor}`);
                    return valor;
                }
            }
        }
        console.log(`❌ Não encontrado campo para termos: ${termosChave.join(', ')}`);
        return '';
    };
    
    // Mapear valores EXATOS do Excel
    const valores = {
        area: buscarCampo(['Área em metros quadrados', 'área', 'area']),
        radiacao: buscarCampo(['Quantidade de Radiação Máxima Solar', 'radiacao', 'radiação']),
        capacidade: buscarCampo(['Capacidade de Produção de energia em kW por m²', 'capacidade']),
        producao: buscarCampo(['Produção de energia kW do telhado', 'produção', 'producao']),
        placas_dia: buscarCampo(['Capacidade de Produção de energia em Placas Fotovoltaicas em kW.h.dia', 'placas.*dia']),
        placas_mes: buscarCampo(['Capacidade de Produção de energia em Placas Fotovoltaicas em kW.h.mês', 'placas.*mês', 'placas.*mes']),
        quantidade_placas: buscarCampo(['Quantidade de Placas Fotovoltaicas', 'quantidade.*placas']),
        potencial: buscarCampo(['Potencial médio de geração FV', 'potencial']),
        renda_total: buscarCampo(['Renda Total', 'renda total']),
        renda_per_capita: buscarCampo(['Renda per capita', 'renda per capita']),
        renda_domiciliar: buscarCampo(['Renda domiciliar per capita', 'renda domiciliar'])
    };
    
    // Aplicar valores com FORMATAÇÃO BRASILEIRA CORRETA
    const elementos = {
        'area-edificacao-display': valores.area ? formatNumber(valores.area, 2) : '0,00',
        'radiacao-max-display': valores.radiacao ? formatNumber(valores.radiacao, 2) : '0,00',
        'capacidade-por-m2-display': valores.capacidade ? formatNumber(valores.capacidade, 2) : '0,00',
        'producao-telhado-display': valores.producao ? formatNumber(valores.producao, 2) : '0,00',
        'capacidade-placas-dia-display': valores.placas_dia ? formatNumber(valores.placas_dia, 2) : '0,00',
        'capacidade-placas-mes-display': valores.placas_mes ? formatNumber(valores.placas_mes, 2) : '0,00',
        'quantidade-placas-display': valores.quantidade_placas ? formatNumber(valores.quantidade_placas, 0) : '0',
        'potencial-medio-dia-display': valores.potencial ? formatNumber(valores.potencial, 2) : '0,00',
        'renda-total-display': valores.renda_total ? formatNumber(valores.renda_total, 2) : '0,00',
        'renda-per-capita-display': valores.renda_per_capita ? formatNumber(valores.renda_per_capita, 2) : '0,00',
        'renda-domiciliar-per-capita-display': valores.renda_domiciliar ? formatNumber(valores.renda_domiciliar, 2) : '0,00'
    };
    
    Object.entries(elementos).forEach(([id, valorFormatado]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valorFormatado;
        }
    });
    
    console.log('✅ Cards atualizados com FORMATAÇÃO BRASILEIRA CORRETA');
    console.log('📊 Exemplos de formatação:');
    console.log(`  Área original: "${valores.area}" → Formatado: "${elementos['area-edificacao-display']}"`);
    console.log(`  Produção original: "${valores.producao}" → Formatado: "${elementos['producao-telhado-display']}"`);
}

function updateRelatorio(imovel = null) {
    const tituloEl = document.getElementById('relatorio-titulo');
    const conteudoEl = document.getElementById('relatorio-conteudo');
    if (!tituloEl || !conteudoEl) return;
    
    if (imovel && imovel.excelData) {
        const dados = imovel.excelData;
        tituloEl.textContent = `📊 Relatório - Imóvel ${imovel.id}`;
        
        // Buscar dados específicos do Excel
        const bairro = dados['Bairros'] || dados['Bairro'] || 'Não informado';
        const area = dados['Área em metros quadrados da edificação'] || '0';
        const producao = dados['Produção de energia kW do telhado do edifício'] || '0';
        const radiacao = dados['Quantidade de Radiação Máxima Solar nos mêses (kW.m²)'] || '0';
        
        const textoRelatorio = `O imóvel selecionado no Bairro ${bairro}, localizado nas coordenadas (${imovel.centroid[0].toFixed(6)}, ${imovel.centroid[1].toFixed(6)}), possui ${area} m², com Quantidade de Radiação Máxima Solar de ${radiacao} kW/m², e produção de energia de ${producao} kW do telhado do edifício.`;
        
        conteudoEl.innerHTML = `<p style="text-align: justify; line-height: 1.6;">${textoRelatorio}</p>`;
    } else {
        tituloEl.textContent = '📊 Relatório do Imóvel';
        conteudoEl.innerHTML = `
            <p>Selecione um imóvel no mapa para ver o relatório detalhado.</p>
            <p><strong>Sistema EXCEL REAL:</strong></p>
            <ul>
                <li>✅ Lê dados EXATAMENTE como estão no Excel</li>
                <li>✅ Preserva formatação original</li>
                <li>✅ Sem conversões ou alterações</li>
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
    console.log('🔍 === DIAGNÓSTICO DETALHADO ===');
    if (dadosGeoJSON && dadosGeoJSON.length > 0) {
        console.log(`📍 GeoJSON: ${dadosGeoJSON.length} features`);
    }
    if (dadosExcel && dadosExcel.length > 0) {
        console.log(`📊 Excel: ${dadosExcel.length} registros`);
        console.log('Exemplo de dados Excel originais:');
        console.log(dadosExcel[0]);
    }
    if (dadosCompletos && dadosCompletos.length > 0) {
        console.log(`🔗 Dados completos: ${dadosCompletos.length} imóveis`);
        console.log('Exemplo de dados combinados:');
        console.log(dadosCompletos[0]);
    }
}

async function initializeDashboard() {
    console.log('📊 === SOLARMAP - VERSÃO EXCEL REAL ===');
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
        console.log('✅ Dashboard EXCEL REAL inicializado!');
        
        // TESTE DA FORMATAÇÃO BRASILEIRA
        testarFormatacao();
        
        // TESTE DOS DADOS
        console.log('🔍 === TESTE DOS DADOS CARREGADOS ===');
        if (dadosCompletos.length > 0) {
            const exemploImovel = dadosCompletos[0];
            console.log('Exemplo de imóvel completo:');
            console.log('ID:', exemploImovel.id);
            console.log('Dados Excel originais:', exemploImovel.excelData);
            console.log('Todos os campos disponíveis:');
            if (exemploImovel.excelData) {
                Object.keys(exemploImovel.excelData).forEach(campo => {
                    console.log(`  - ${campo}`);
                });
            }
        }
        
        showMessage('✅ SolarMap Excel Reader carregado - dados preservados!');
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
                    if (window.layerGroup && window.layerGroup.getLayers().length > 0) {
                        console.log(`✅ Polígonos adicionados: ${window.layerGroup.getLayers().length}`);
                        clearInterval(checkProgress);
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        console.warn('⚠️ Timeout ao aguardar polígonos');
                        clearInterval(checkProgress);
                        resolve();
                    }
                }, 500);
            } else {
                reject(new Error('Função addPolygonsToMap não encontrada'));
            }
        } catch (error) {
            reject(error);
        }
    });
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
window.diagnosticDataDetailed = diagnosticDataDetailed;
window.convertSIRGAS2000UTMToWGS84 = convertSIRGAS2000UTMToWGS84;
window.SIRGAS_2000_UTM_23S = SIRGAS_2000_UTM_23S;
window.isValidSaoLuisCoordinate = isValidSaoLuisCoordinate;

console.log('✅ DASHBOARD EXCEL REAL - DADOS PRESERVADOS!');
