// ================================
// DASHBOARD PRINCIPAL - SOLARMAP
// VERSÃO EXCEL READER - Lê arquivos XLSX diretamente
// ================================
console.log('🚀 Dashboard SolarMap - VERSÃO EXCEL READER');

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
// FUNÇÃO DE FORMATAÇÃO GLOBAL CORRIGIDA - VERSÃO FINAL
// ================================
function formatNumber(numero, decimais = 2) {
    if (numero === null || numero === undefined || isNaN(numero)) {
        return decimais > 0 ? '0,00' : '0';
    }
    
    const valor = parseFloat(numero);
    if (isNaN(valor)) {
        return decimais > 0 ? '0,00' : '0';
    }
    
    // FORMATAÇÃO BRASILEIRA CORRETA: 1.234.567,89
    return valor.toLocaleString('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais
    });
}

// FUNÇÃO ESPECÍFICA PARA MANTER COMO NO EXCEL
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
// FUNÇÃO DE DEBUG EXCEL - NOVA
// ================================
function debugExcelStructure(workbook, jsonData, headers) {
    console.log('🔍 === DEBUG EXCEL STRUCTURE ===');
    
    // 1. Informações do workbook
    console.log('📊 Workbook info:');
    console.log('  - SheetNames:', workbook.SheetNames);
    console.log('  - Workbook:', workbook.Workbook);
    
    // 2. Informações da primeira planilha
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    console.log(`📋 Worksheet "${firstSheetName}" info:`);
    console.log('  - Range:', worksheet['!ref']);
    console.log('  - Merge:', worksheet['!merges']);
    
    // 3. Primeiras células para entender estrutura
    console.log('🔍 Primeiras 10 células:');
    const cellAddresses = ['A1', 'B1', 'C1', 'D1', 'E1', 'A2', 'B2', 'C2', 'D2', 'E2'];
    cellAddresses.forEach(addr => {
        const cell = worksheet[addr];
        if (cell) {
            console.log(`  ${addr}: "${cell.v}" (type: ${cell.t})`);
        } else {
            console.log(`  ${addr}: (empty)`);
        }
    });
    
    // 4. Análise dos dados JSON extraídos
    console.log('📊 JSON Data Analysis:');
    console.log('  - Total rows:', jsonData.length);
    console.log('  - Headers (first row):', headers);
    
    if (jsonData.length > 1) {
        console.log('  - Second row:', jsonData[1]);
        console.log('  - Third row:', jsonData[2]);
    }
    
    // 5. Verificar se há dados vazios
    let emptyRows = 0;
    let validRows = 0;
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const hasData = row.some(cell => cell !== null && cell !== undefined && cell !== '');
        if (hasData) {
            validRows++;
        } else {
            emptyRows++;
        }
    }
    
    console.log(`📈 Rows analysis: ${validRows} valid, ${emptyRows} empty`);
    
    // 6. Alternativa: tentar extrair dados de forma diferente
    console.log('🔄 Tentando método alternativo...');
    try {
        const alternativeData = XLSX.utils.sheet_to_json(worksheet, {
            raw: true,
            defval: null
        });
        console.log('✅ Método alternativo extraiu:', alternativeData.length, 'registros');
        if (alternativeData.length > 0) {
            console.log('📋 Primeiro registro alternativo:', alternativeData[0]);
            console.log('📋 Campos do primeiro registro:', Object.keys(alternativeData[0]));
        }
        return alternativeData;
    } catch (error) {
        console.error('❌ Método alternativo falhou:', error);
        return null;
    }
}

// ================================
// NOVO: CARREGAMENTO DE DADOS EXCEL COM MÚLTIPLOS CAMINHOS
// ================================
async function loadExcelData() {
    console.log('📊 === CARREGANDO EXCEL (.xlsx) ===');
    
    // Lista de possíveis caminhos para o arquivo Excel
    const possiblePaths = [
        'data/Dados_energia_solar.xlsx',
        'Dados_energia_solar.xlsx',
        'data/dados_energia_solar.xlsx',
        'dados_energia_solar.xlsx',
        'data/excel/Dados_energia_solar.xlsx',
        'excel/Dados_energia_solar.xlsx',
        'assets/Dados_energia_solar.xlsx'
    ];
    
    let foundPath = null;
    let response = null;
    
    // Tentar cada caminho até encontrar o arquivo
    for (const path of possiblePaths) {
        try {
            console.log(`🔍 Tentando carregar: ${path}`);
            response = await fetch(path);
            if (response.ok) {
                foundPath = path;
                console.log(`✅ Arquivo Excel encontrado em: ${foundPath}`);
                break;
            } else {
                console.log(`❌ Não encontrado em: ${path} (Status: ${response.status})`);
            }
        } catch (error) {
            console.log(`❌ Erro ao tentar: ${path} - ${error.message}`);
        }
    }
    
    if (!foundPath || !response.ok) {
        console.error('❌ Arquivo Excel não encontrado em nenhum dos caminhos testados');
        console.log('📋 Caminhos testados:', possiblePaths);
        throw new Error(`❌ Arquivo Excel não encontrado! Testados: ${possiblePaths.join(', ')}`);
    }
    
    try {
        console.log('✅ Arquivo Excel encontrado, processando...');
        const arrayBuffer = await response.arrayBuffer();
        
        // Usar SheetJS para ler o arquivo Excel
        const workbook = XLSX.read(arrayBuffer, {
            type: 'array',
            cellDates: true,
            cellStyles: true,
            cellFormulas: true
        });
        
        // Pegar a primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        console.log(`📋 Processando planilha: ${firstSheetName}`);
        
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converter para JSON com headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: null,
            raw: false
        });
        
        if (jsonData.length === 0) {
            throw new Error('❌ Planilha Excel está vazia');
        }
        
        // Primeira linha são os headers
        const headers = jsonData[0];
        console.log(`📋 Headers encontrados (${headers.length}):`, headers.slice(0, 5), '...');
        
        // 🔍 DEBUG: Analisar estrutura do Excel
        const alternativeData = debugExcelStructure(workbook, jsonData, headers);
        
        // Se método alternativo funcionar, usar ele
        if (alternativeData && alternativeData.length > 0) {
            console.log('🔄 Usando método alternativo de extração');
            dadosExcel = alternativeData.map(row => normalizeExcelData(row));
            console.log(`✅ Dados normalizados (método alternativo): ${dadosExcel.length} registros`);
            
            // DEBUG: Primeiro registro normalizado
            if (dadosExcel.length > 0) {
                console.log('🔍 Primeiro registro normalizado (método alternativo):');
                console.log(dadosExcel[0]);
            }
            return;
        }
        
        // Continuar com método original se alternativo falhar
        console.log('⚠️ Método alternativo não funcionou, continuando com método original...');
        
        // Converter dados em objetos
        const dataObjects = [];
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const obj = {};
            
            headers.forEach((header, index) => {
                if (header && header.trim()) {
                    let value = row[index];
                    
                    // Limpar e converter valores
                    if (typeof value === 'string') {
                        value = value.trim();
                        // Tentar converter números com vírgula
                        if (value.match(/^\d+[,\.]\d+$/)) {
                            value = parseFloat(value.replace(',', '.'));
                        }
                    }
                    
                    obj[header.trim()] = value;
                }
            });
            
            if (Object.keys(obj).length > 0) {
                dataObjects.push(obj);
            }
        }
        
        console.log(`✅ Excel processado: ${dataObjects.length} registros`);
        
        // DEBUG: Mostrar primeiro registro
        if (dataObjects.length > 0) {
            console.log('🔍 Primeiro registro do Excel:');
            console.log(dataObjects[0]);
            debugFieldMapping(dataObjects[0]);
        }
        
        // Normalizar dados
        dadosExcel = dataObjects.map(row => normalizeExcelData(row));
        console.log(`✅ Dados normalizados: ${dadosExcel.length} registros`);
        
        // DEBUG: Primeiro registro normalizado
        if (dadosExcel.length > 0) {
            console.log('🔍 Primeiro registro normalizado:');
            console.log(dadosExcel[0]);
        }
        
    } catch (error) {
        console.error('❌ Erro ao processar Excel:', error);
        
        // Fallback: tentar carregar JSON como backup
        console.log('🔄 Tentando fallback para JSON...');
        try {
            await loadExcelDataJSON();
        } catch (jsonError) {
            console.error('❌ Fallback JSON também falhou:', jsonError);
            throw new Error(`Não foi possível carregar dados Excel nem JSON: ${error.message}`);
        }
    }
}

// Fallback para JSON (caso Excel não funcione)
async function loadExcelDataJSON() {
    console.log('📄 === CARREGANDO JSON FALLBACK ===');
    
    const possibleJsonPaths = [
        'data/Dados_energia_solar.json',
        'Dados_energia_solar.json',
        'data/dados_energia_solar.json',
        'dados_energia_solar.json',
        'assets/Dados_energia_solar.json'
    ];
    
    let foundJsonPath = null;
    let jsonResponse = null;
    
    for (const path of possibleJsonPaths) {
        try {
            console.log(`🔍 Tentando JSON: ${path}`);
            jsonResponse = await fetch(path);
            if (jsonResponse.ok) {
                foundJsonPath = path;
                console.log(`✅ JSON encontrado em: ${foundJsonPath}`);
                break;
            }
        } catch (error) {
            console.log(`❌ JSON não encontrado: ${path}`);
        }
    }
    
    if (!foundJsonPath || !jsonResponse.ok) {
        throw new Error(`❌ Arquivo JSON não encontrado! Testados: ${possibleJsonPaths.join(', ')}`);
    }
    
    const jsonData = await jsonResponse.json();
    console.log(`✅ JSON fallback carregado: ${jsonData.length} registros`);
    dadosExcel = jsonData.map(row => normalizeExcelData(row));
}

// ================================
// FUNÇÕES DE EXTRAÇÃO E NORMALIZAÇÃO
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

// NOVA: Função para normalizar dados do Excel
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
        'Renda domiciliar per capita': 'renda_domiciliar_per_capita',
        
        // DADOS MENSAIS DE PRODUÇÃO
        'Produção de energia no mês de janeiro kW do telhado do edifício': 'producao_janeiro',
        'Produção de energia no mês de fevereiro kW do telhado do edifício': 'producao_fevereiro',
        'Produção de energia no mês de março kW do telhado do edifício': 'producao_marco',
        'Produção de energia no mês de abril kW do telhado do edifício': 'producao_abril',
        'Produção de energia no mês de maio kW do telhado do edifício': 'producao_maio',
        'Produção de energia no mês de junho kW do telhado do edifício': 'producao_junho',
        'Produção de energia no mês de julho kW do telhado do edifício': 'producao_julho',
        'Produção de energia no mês de agosto kW do telhado do edifício': 'producao_agosto',
        'Produção de energia no mês de setembro kW do telhado do edifício': 'producao_setembro',
        'Produção de energia no mês de outubro kW do telhado do edifício': 'producao_outubro',
        'Produção de energia no mês de novembro kW do telhado do edifício': 'producao_novembro',
        'Produção de energia no mês de dezembro kW do telhado do edifício': 'producao_dezembro',
        
        // NOVO: DADOS MENSAIS DE RADIAÇÃO
        'Quantidade de Radiação Solar no mês de janeiro (kW.m²)': 'radiacao_janeiro',
        'Quantidade de Radiação Solar no mês de fevereiro (kW.m²)': 'radiacao_fevereiro',
        'Quantidade de Radiação Solar no mês de março (kW.m²)': 'radiacao_marco',
        'Quantidade de Radiação Solar no mês de abril (kW.m²)': 'radiacao_abril',
        'Quantidade de Radiação Solar no mês de maio (kW.m²)': 'radiacao_maio',
        'Quantidade de Radiação Solar no mês de junho (kW.m²)': 'radiacao_junho',
        'Quantidade de Radiação Solar no mês de julho (kW.m²)': 'radiacao_julho',
        'Quantidade de Radiação Solar no mês de agosto (kW.m²)': 'radiacao_agosto',
        'Quantidade de Radiação Solar no mês de setembro (kW.m²)': 'radiacao_setembro',
        'Quantidade de Radiação Solar no mês de outubro (kW.m²)': 'radiacao_outubro',
        'Quantidade de Radiação Solar no mês de novembro (kW.m²)': 'radiacao_novembro',
        'Quantidade de Radiação Solar no mês de dezembro (kW.m²)': 'radiacao_dezembro'
    };

    const normalized = {};
    
    // Mapear campos conhecidos
    Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = fieldMapping[key] || key.toLowerCase().replace(/\s+/g, '_');
        
        if (value !== null && value !== undefined && value !== '') {
            if (typeof value === 'string' && value.length > 0) {
                // CORRIGIDO: Preservar valores originais para campos de renda
                if (key.includes('Renda') || key.includes('renda')) {
                    // Para valores de renda, manter como string se não for numérico
                    const cleanValue = value.toString().replace(/[^\d,.-]/g, '').replace(',', '.');
                    const numValue = parseFloat(cleanValue);
                    normalized[normalizedKey] = isNaN(numValue) ? value : numValue;
                } else {
                    // Para outros campos, tentar converter para número
                    const cleanValue = value
                        .toString()
                        .replace(/\./g, '')
                        .replace(',', '.')
                        .replace(/[^\d.-]/g, '');
                    const numValue = parseFloat(cleanValue);
                    normalized[normalizedKey] = isNaN(numValue) ? value : numValue;
                }
            } else if (typeof value === 'number') {
                normalized[normalizedKey] = value;
            } else {
                normalized[normalizedKey] = value;
            }
        } else {
            normalized[normalizedKey] = 0;
        }
    });
    
    // NOVO: Criar arrays dos dados mensais REAIS
    const dadosMensaisProducao = [
        normalized.producao_janeiro || 0,
        normalized.producao_fevereiro || 0,
        normalized.producao_marco || 0,
        normalized.producao_abril || 0,
        normalized.producao_maio || 0,
        normalized.producao_junho || 0,
        normalized.producao_julho || 0,
        normalized.producao_agosto || 0,
        normalized.producao_setembro || 0,
        normalized.producao_outubro || 0,
        normalized.producao_novembro || 0,
        normalized.producao_dezembro || 0
    ];
    
    const dadosMensaisRadiacao = [
        normalized.radiacao_janeiro || 0,
        normalized.radiacao_fevereiro || 0,
        normalized.radiacao_marco || 0,
        normalized.radiacao_abril || 0,
        normalized.radiacao_maio || 0,
        normalized.radiacao_junho || 0,
        normalized.radiacao_julho || 0,
        normalized.radiacao_agosto || 0,
        normalized.radiacao_setembro || 0,
        normalized.radiacao_outubro || 0,
        normalized.radiacao_novembro || 0,
        normalized.radiacao_dezembro || 0
    ];
    
    // Adicionar arrays ao objeto normalizado
    normalized.dados_mensais_producao = dadosMensaisProducao;
    normalized.dados_mensais_radiacao = dadosMensaisRadiacao;
    
    // Debug para verificar dados mensais
    const temProducao = dadosMensaisProducao.some(valor => valor > 0);
    const temRadiacao = dadosMensaisRadiacao.some(valor => valor > 0);
    
    if (temProducao || temRadiacao) {
        console.log(`✅ Dados mensais REAIS para OBJECTID ${normalized.objectid}:`);
        if (temProducao) console.log('   📊 Produção:', dadosMensaisProducao.slice(0, 3), '...');
        if (temRadiacao) console.log('   ☀️ Radiação:', dadosMensaisRadiacao.slice(0, 3), '...');
    }
    
    // CORRIGIDO: Calcular métricas baseado nos dados disponíveis
    if (!normalized.radiacao_max || normalized.radiacao_max === 0) {
        // Se não tem radiação máxima, calcular do maior valor mensal
        const radiacaoMensal = normalized.dados_mensais_radiacao;
        if (radiacaoMensal && radiacaoMensal.length > 0) {
            const maxRadiacao = Math.max(...radiacaoMensal.filter(val => val > 0));
            if (maxRadiacao > 0) {
                normalized.radiacao_max = maxRadiacao;
                console.log(`✅ Calculando radiacao_max do maior mensal: ${maxRadiacao}`);
            }
        }
    }
    
    if (!normalized.quantidade_placas || normalized.quantidade_placas === 0) {
        // Calcular quantidade de placas baseado na capacidade e área
        if (normalized.area_edificacao && normalized.capacidade_por_m2) {
            // Capacidade total = área × capacidade por m²
            const capacidadeTotal = normalized.area_edificacao * normalized.capacidade_por_m2;
            // Placas padrão residencial: ~0.4-0.5 kW cada
            const potenciaPorPlaca = 0.45; // kW por placa (média)
            const placasCalculadas = Math.ceil(capacidadeTotal / potenciaPorPlaca);
            normalized.quantidade_placas = placasCalculadas;
            console.log(`✅ Calculando quantidade_placas: ${placasCalculadas} (baseado em ${capacidadeTotal.toFixed(2)}kW total)`);
        } else if (normalized.producao_telhado) {
            // Alternativa: usar produção do telhado
            const potenciaPorPlaca = 0.45;
            const placasCalculadas = Math.ceil(normalized.producao_telhado / potenciaPorPlaca);
            normalized.quantidade_placas = placasCalculadas;
            console.log(`✅ Calculando quantidade_placas do telhado: ${placasCalculadas}`);
        } else {
            // Última opção: usar valor simbólico baseado na área
            if (normalized.area_edificacao > 0) {
                // Aproximadamente 1 placa por 2m² (estimativa conservadora)
                const placasEstimadas = Math.ceil(normalized.area_edificacao / 2);
                normalized.quantidade_placas = placasEstimadas;
                console.log(`✅ Estimando quantidade_placas pela área: ${placasEstimadas}`);
            }
        }
    }
    
    return normalized;
}

function debugFieldMapping(sampleData) {
    console.log('🔍 === DEBUG MAPEAMENTO DE CAMPOS COMPLETO ===');
    if (!sampleData || typeof sampleData !== 'object') {
        console.log('❌ Dados de amostra inválidos');
        return;
    }
    
    // Mostrar TODOS os campos disponíveis
    const allFields = Object.keys(sampleData);
    console.log('📋 === TODOS OS CAMPOS DO EXCEL ===');
    allFields.forEach((field, index) => {
        const value = sampleData[field];
        console.log(`${index + 1}. "${field}" = ${value} (tipo: ${typeof value})`);
    });
    
    // Procurar especificamente por campos de radiação
    console.log('\n🌞 === CAMPOS DE RADIAÇÃO ===');
    const radiacaoFields = allFields.filter(field => 
        field.toLowerCase().includes('radiacao') || 
        field.toLowerCase().includes('radiation') ||
        field.toLowerCase().includes('solar')
    );
    radiacaoFields.forEach(field => {
        console.log(`☀️ "${field}" = ${sampleData[field]}`);
    });
    
    // Procurar especificamente por campos de placas
    console.log('\n🔲 === CAMPOS DE PLACAS ===');
    const placasFields = allFields.filter(field => 
        field.toLowerCase().includes('placa') || 
        field.toLowerCase().includes('panel') ||
        field.toLowerCase().includes('quantidade')
    );
    placasFields.forEach(field => {
        console.log(`🔲 "${field}" = ${sampleData[field]}`);
    });
    
    // Procurar por campos de capacidade
    console.log('\n⚡ === CAMPOS DE CAPACIDADE ===');
    const capacidadeFields = allFields.filter(field => 
        field.toLowerCase().includes('capacidade') ||
        field.toLowerCase().includes('capacity') ||
        field.toLowerCase().includes('produc')
    );
    capacidadeFields.forEach(field => {
        console.log(`⚡ "${field}" = ${sampleData[field]}`);
    });
    
    // Procurar por campos de área
    console.log('\n🏠 === CAMPOS DE ÁREA ===');
    const areaFields = allFields.filter(field => 
        field.toLowerCase().includes('area') ||
        field.toLowerCase().includes('m²') ||
        field.toLowerCase().includes('metros')
    );
    areaFields.forEach(field => {
        console.log(`🏠 "${field}" = ${sampleData[field]}`);
    });
}

// ================================
// CONTINUA COM AS FUNÇÕES RESTANTES...
// ================================

async function linkDataReal() {
    console.log('🔗 === VINCULAÇÃO REAL ===');
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
                properties: combineProperties(geo, dadosExcel, objectId),
                originalGeoProps: geo.originalProperties,
                excelData: dadosExcel,
                isLinked: !!dadosExcel
            };
    // NOVO: Debug detalhado de cada objeto processado (apenas os 3 primeiros)
    if (dadosCompletos.length <= 3) {
        console.log(`🔍 === DEBUG OBJETO ${dadosCompletos.length} ===`);
        console.log('ID:', combinedItem.id);
        console.log('Coordenadas válidas:', !!processedGeometry);
        console.log('Centroide:', processedGeometry?.centroid);
        console.log('Properties:', combinedItem.properties);
        console.log('Dados Excel vinculados:', !!dadosExcel);
    }
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
    console.log(`📈 Taxa de vinculação: ${dadosCompletos.length > 0 ? ((sucessos / dadosCompletos.length) * 100).toFixed(1) : 0}%`);
    
    if (dadosCompletos.length === 0) {
        throw new Error('Nenhum dado válido após processamento');
    }
    if (sucessos > 0) {
        console.log(`✅ Vinculação bem-sucedida: ${sucessos} imóveis`);
        showMessage(`✅ Vinculação: ${sucessos} imóveis com dados Excel`);
    }
    window.dadosCompletos = dadosCompletos;
    calcularEstatisticas();
    calcularEstatisticasPorBairro();
    updateSummaryCards();
    return dadosCompletos;
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
        renda_domiciliar_per_capita: excelData?.renda_domiciliar_per_capita || 0,
        
        // NOVO: Adicionar dados mensais reais de produção e radiação
        dados_mensais_producao: excelData?.dados_mensais_producao || new Array(12).fill(0),
        dados_mensais_radiacao: excelData?.dados_mensais_radiacao || new Array(12).fill(0)
    };
    
    // DEBUG: Para os 3 primeiros objetos
    if (objectId <= 13431) { // Os primeiros IDs
        console.log(`🔍 === DEBUG COMBINE PROPERTIES ${objectId} ===`);
        console.log('ExcelData disponível:', !!excelData);
        if (excelData) {
            console.log('ExcelData keys:', Object.keys(excelData).slice(0, 10), '...');
            console.log('Alguns valores:', {
                bairro: excelData.bairro,
                area_edificacao: excelData.area_edificacao,
                producao_telhado: excelData.producao_telhado,
                capacidade_por_m2: excelData.capacidade_por_m2
            });
        }
        console.log('Combined result:', combined);
    }
    
    return combined;
}

function calcularEstatisticas() {
    if (!dadosCompletos || dadosCompletos.length === 0) {
        console.log('⚠️ Nenhum dado disponível para calcular estatísticas');
        return;
    }
    
    console.log(`📊 Calculando estatísticas para ${dadosCompletos.length} itens`);
    
    const totalImoveis = dadosCompletos.length;
    
    // CORRIGIDO: Verificar se o item e suas propriedades existem
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
        
        // CORRIGIDO: Verificar se as propriedades existem
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
    console.log('📊 Estatísticas por bairro calculadas:', estatisticasPorBairro);
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
        const total = dados.reduce((sum, item) => sum + (item.properties.capacidade_placas_mes || 0), 0);
        producaoEl.textContent = formatNumber(total, 0);
    }
    if (mediaEl) {
        const total = dados.reduce((sum, item) => sum + (item.properties.capacidade_placas_mes || 0), 0);
        const media = dados.length > 0 ? total / dados.length : 0;
        mediaEl.textContent = formatNumber(media, 2);
    }
}

function filtrarDados() {
    return dadosCompletos.filter(item => {
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
    
    if (imovel) {
        console.log('🔍 === DEBUG VALORES DOS CARDS ===');
        console.log(`Imóvel ID: ${imovel.id}`);
        console.log(`Bairro: ${imovel.properties.bairro}`);
        console.log(`Área: ${imovel.properties.area_edificacao}`);
        console.log(`Radiação Máxima: ${imovel.properties.radiacao_max}`);
        console.log(`Capacidade por m²: ${imovel.properties.capacidade_por_m2}`);
        console.log(`Capacidade Placas Mês: ${imovel.properties.capacidade_placas_mes}`);
        console.log(`Quantidade de Placas: ${imovel.properties.quantidade_placas}`);
        console.log(`Potencial Médio: ${imovel.properties.potencial_medio_dia}`);
        console.log('Dados originais Excel:', imovel.excelData);
        
        const camposZerados = [];
        if (!imovel.properties.radiacao_max || imovel.properties.radiacao_max === 0) {
            camposZerados.push('radiacao_max');
        }
        if (!imovel.properties.quantidade_placas || imovel.properties.quantidade_placas === 0) {
            camposZerados.push('quantidade_placas');
        }
        
        if (camposZerados.length > 0) {
            console.log('⚠️ Campos zerados detectados:', camposZerados);
            console.log('📋 Todos os campos disponíveis no Excel:', Object.keys(imovel.excelData || {}));
        }
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
            <p><strong>Sistema EXCEL READER:</strong></p>
            <ul>
                <li>✅ Lê arquivos Excel (.xlsx) diretamente</li>
                <li>✅ Fallback automático para JSON</li>
                <li>✅ Processamento otimizado</li>
                <li>✅ Múltiplos caminhos de busca</li>
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
        const objectIds = dadosGeoJSON.map(item => item.id);
        const uniqueIds = new Set(objectIds);
        console.log(`📋 OBJECTIDs GeoJSON: ${objectIds.length} total, ${uniqueIds.size} únicos`);
        console.log(`📋 Range GeoJSON: ${Math.min(...objectIds)} até ${Math.max(...objectIds)}`);
    }
    if (dadosExcel && dadosExcel.length > 0) {
        console.log(`📊 Excel: ${dadosExcel.length} registros`);
        const objectIds = dadosExcel.map(row => extractObjectIdFromExcel(row)).filter(id => id !== null);
        const uniqueIds = new Set(objectIds);
        console.log(`📋 OBJECTIDs Excel: ${objectIds.length} válidos, ${uniqueIds.size} únicos`);
        if (objectIds.length > 0) {
            console.log(`📋 Range Excel: ${Math.min(...objectIds)} até ${Math.max(...objectIds)}`);
        }
        const firstRow = dadosExcel[0];
        console.log(`📋 Campos disponíveis (${Object.keys(firstRow).length}):`, Object.keys(firstRow));
    }
    if (dadosGeoJSON.length > 0 && dadosExcel.length > 0) {
        const geoIds = new Set(dadosGeoJSON.map(item => item.id));
        const excelIds = new Set(dadosExcel.map(row => extractObjectIdFromExcel(row)).filter(id => id !== null));
        const intersecao = new Set([...geoIds].filter(id => excelIds.has(id)));
        console.log('🔗 ANÁLISE DE VINCULAÇÃO:');
        console.log(`  📍 GeoJSON: ${geoIds.size} IDs únicos`);
        console.log(`  📊 Excel: ${excelIds.size} IDs únicos`);
        console.log(`  🎯 Interseção: ${intersecao.size} IDs comuns`);
        if (intersecao.size > 0) {
            const taxaVinculacao = (intersecao.size / Math.min(geoIds.size, excelIds.size)) * 100;
            console.log(`  📈 Taxa de vinculação: ${taxaVinculacao.toFixed(1)}%`);
            console.log(`  ✅ Primeiros IDs comuns:`, [...intersecao].slice(0, 5));
        }
    }
}

async function initializeDashboard() {
    console.log('📊 === SOLARMAP - VERSÃO EXCEL READER ===');
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
        console.log('✅ Dashboard EXCEL READER inicializado!');
        showMessage('✅ SolarMap Excel Reader carregado com sucesso!');
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
window.debugFieldMapping = debugFieldMapping;
window.calcularEstatisticasPorBairro = calcularEstatisticasPorBairro;
window.getMediaDoBairro = getMediaDoBairro;
window.formatarComoExcel = formatarComoExcel;
window.generateMonthlyAverages = generateMonthlyAverages;
window.debugExcelStructure = debugExcelStructure;

console.log('✅ DASHBOARD EXCEL READER COMPLETO CARREGADO!');
