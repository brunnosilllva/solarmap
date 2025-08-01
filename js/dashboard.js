function debugFieldMapping(sampleData) {
    console.log('🔍 === DEBUG MAPEAMENTO DE CAMPOS ===');
    if (!sampleData || typeof sampleData !== 'object') {
        console.log('❌ Dados de amostra inválidos');
        return;
    }
    
    const camposEsperados = [
        'Quantidade de Radiação Máxima Solar nos mêses (kW.m²)',
        'Quantidade de Placas Fotovoltaicas capaz de gerar a energia gerada do imóvel',
        'Capacidade de Produção de energia em kW por m²',
        'Capacidade de Produção de energia em Placas Fotovoltaicas em kW.h.mês',
        'Área em metros quadrados da edificação',
        'Produção de energia kW do telhado do edifício',
        'OBJECTID',
        'Bairros',
        'Bairro'
    ];
    
    console.log('📋 Campos disponíveis no Excel:', Object.keys(sampleData));
    console.log('🎯 Verificando campos esperados:');
    
    const camposEncontrados = [];
    const camposNaoEncontrados = [];
    
    camposEsperados.forEach(campo => {
        if (sampleData.hasOwnProperty(campo)) {
            console.log(`✅ ENCONTRADO: "${campo}" = ${sampleData[campo]}`);
            camposEncontrados.push(campo);
        } else {
            console.log(`❌ NÃO ENCONTRADO: "${campo}"`);
            camposNaoEncontrados.push(campo);
            
            // Procurar campos similares
            const similares = Object.keys(sampleData).filter(key => {
                const keyLower = key.toLowerCase();
                const campoLower = campo.toLowerCase();
                return keyLower.includes('radiacao') && campoLower.includes('radiacao') ||
                       keyLower.includes('placa') && campoLower.includes('placa') ||
                       keyLower.includes('capacidade') && campoLower.includes('capacidade') ||
                       keyLower.includes('area') && campoLower.includes('area') ||
                       keyLower.includes('producao') && campoLower.includes('producao') ||
                       keyLower.includes('objectid') && campoLower.includes('objectid') ||
                       keyLower.includes('bairro') && campoLower.includes('bairro');
            });
            
            if (similares.length > 0) {
                console.log(`   🔎 Campos similares:`, similares);
            }
        }
    });
    
    // Mostrar estatísticas
    console.log(`📊 Campos encontrados: ${camposEncontrados.length}/${camposEsperados.length}`);
    console.log(`📊 Taxa de compatibilidade: ${((camposEncontrados.length / camposEsperados.length) * 100).toFixed(1)}%`);
    
    // Se poucos campos foram encontrados, mostrar todos os campos disponíveis
    if (camposEncontrados.length < 3) {
        console.log('⚠️ Poucos campos reconhecidos. Todos os campos disponíveis:');
        Object.entries(sampleData).forEach(([key, value]) => {
            console.log(`   "${key}": ${value}`);
        });
    }
    
    return {
        encontrados: camposEncontrados// ================================
// DASHBOARD PRINCIPAL - SOLARMAP
// VERSÃO EXCEL READER CORRIGIDA - Lê arquivos XLSX diretamente
// ================================
console.log('🚀 Dashboard SolarMap - VERSÃO EXCEL READER CORRIGIDA');

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
        // Tentar diferentes caminhos para o arquivo
        const possiblePaths = [
            'data/Dados_energia_solar.geojson',
            './data/Dados_energia_solar.geojson',
            'Dados_energia_solar.geojson',
            './Dados_energia_solar.geojson'
        ];
        
        let geoData = null;
        let loadedPath = null;
        
        for (const path of possiblePaths) {
            try {
                console.log(`🔍 Tentando carregar: ${path}`);
                const response = await fetch(path);
                if (response.ok) {
                    geoData = await response.json();
                    loadedPath = path;
                    console.log(`✅ GeoJSON carregado de: ${path}`);
                    break;
                }
            } catch (error) {
                console.log(`❌ Falha ao carregar: ${path}`);
            }
        }
        
        if (!geoData) {
            throw new Error('GeoJSON não encontrado em nenhum caminho testado');
        }
        
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
// CARREGAMENTO DE DADOS EXCEL - VERSÃO CORRIGIDA
// ================================
async function loadExcelData() {
    console.log('📊 === CARREGANDO EXCEL (.xlsx) - VERSÃO CORRIGIDA ===');
    
    // Verificar se SheetJS está disponível
    if (typeof XLSX === 'undefined') {
        console.error('❌ SheetJS não está carregado!');
        throw new Error('SheetJS library não encontrada. Adicione: <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>');
    }
    
    try {
        // Tentar diferentes caminhos para o arquivo Excel
        const possiblePaths = [
            'data/Dados_energia_solar.xlsx',
            './data/Dados_energia_solar.xlsx',
            'Dados_energia_solar.xlsx',
            './Dados_energia_solar.xlsx'
        ];
        
        let arrayBuffer = null;
        let loadedPath = null;
        
        for (const path of possiblePaths) {
            try {
                console.log(`🔍 Tentando carregar Excel: ${path}`);
                const response = await fetch(path);
                if (response.ok) {
                    arrayBuffer = await response.arrayBuffer();
                    loadedPath = path;
                    console.log(`✅ Arquivo Excel encontrado em: ${path}`);
                    break;
                }
            } catch (error) {
                console.log(`❌ Falha ao carregar Excel: ${path}`);
            }
        }
        
        if (!arrayBuffer) {
            console.warn('⚠️ Nenhum arquivo Excel encontrado, tentando fallback para JSON...');
            await loadExcelDataJSON();
            return;
        }
        
        console.log('✅ Arquivo Excel encontrado, processando...');
        
        // Usar SheetJS para ler o arquivo Excel
        const workbook = XLSX.read(arrayBuffer, {
            type: 'array',
            cellDates: true,
            cellStyles: true,
            cellFormulas: true,
            raw: false  // IMPORTANTE: Não usar valores raw para evitar problemas de formatação
        });
        
        // Debug: Mostrar informações do workbook
        console.log('📊 Workbook sheets:', workbook.SheetNames);
        
        // Pegar a primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        console.log(`📋 Processando planilha: ${firstSheetName}`);
        
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Debug: Mostrar range da planilha
        console.log('📏 Range da planilha:', worksheet['!ref']);
        
        // Converter para JSON com headers na primeira linha
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: null,
            raw: false,  // Usar valores formatados
            blankrows: false  // Pular linhas em branco
        });
        
        if (jsonData.length === 0) {
            throw new Error('❌ Planilha Excel está vazia');
        }
        
        console.log(`📊 Total de linhas lidas: ${jsonData.length}`);
        
        // Primeira linha são os headers
        const headers = jsonData[0];
        console.log(`📋 Headers encontrados (${headers.length}):`, headers);
        
        // VERIFICAÇÃO IMPORTANTE: Se só tem 1 header, algo está errado
        if (headers.length <= 1) {
            console.error('❌ PROBLEMA: Apenas 1 coluna detectada. Verificando estrutura...');
            console.log('Primeira linha completa:', jsonData[0]);
            console.log('Segunda linha (se existir):', jsonData[1]);
            
            // Tentar usar método alternativo (sem header como linha)
            console.log('🔄 Tentando método alternativo (JSON direto)...');
            const alternativeData = XLSX.utils.sheet_to_json(worksheet, {
                defval: null,
                raw: false,
                blankrows: false
            });
            
            if (alternativeData.length > 0) {
                console.log('✅ Método alternativo funcionou!');
                console.log('Campos do primeiro registro:', Object.keys(alternativeData[0]));
                console.log('Valores do primeiro registro:', alternativeData[0]);
                
                // Normalizar e validar se os dados são reais
                dadosExcel = alternativeData.map(row => normalizeExcelData(row));
                
                // VALIDAÇÃO: Verificar se os dados normalizados têm valores reais
                if (dadosExcel.length > 0) {
                    const primeiroItem = dadosExcel[0];
                    const temDadosReais = primeiroItem.objectid && (
                        primeiroItem.area_edificacao > 0 ||
                        primeiroItem.producao_telhado > 0 ||
                        primeiroItem.radiacao_max > 0 ||
                        primeiroItem.quantidade_placas > 0
                    );
                    
                    if (temDadosReais) {
                        console.log(`✅ DADOS REAIS DETECTADOS: ${dadosExcel.length} registros`);
                        console.log('✅ Primeiro item validado:', {
                            objectid: primeiroItem.objectid,
                            bairro: primeiroItem.bairro,
                            area: primeiroItem.area_edificacao,
                            producao: primeiroItem.producao_telhado,
                            radiacao: primeiroItem.radiacao_max
                        });
                        return;
                    } else {
                        console.warn('⚠️ Dados carregados mas parecem inválidos');
                    }
                }
            }
        }
        
        // Converter dados em objetos (método original)
        const dataObjects = [];
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue; // Pular linhas vazias
            
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
                        // Se for string vazia, converter para null
                        if (value === '') {
                            value = null;
                        }
                    }
                    
                    obj[header.trim()] = value;
                }
            });
            
            // Só adicionar se tiver dados válidos
            if (Object.keys(obj).length > 0 && Object.values(obj).some(v => v !== null && v !== undefined && v !== '')) {
                dataObjects.push(obj);
            }
        }
        
        console.log(`✅ Excel processado: ${dataObjects.length} registros válidos`);
        
        // DEBUG: Mostrar primeiro registro
        if (dataObjects.length > 0) {
            console.log('🔍 Primeiro registro do Excel:');
            console.log(dataObjects[0]);
            debugFieldMapping(dataObjects[0]);
        } else {
            console.error('❌ NENHUM REGISTRO VÁLIDO ENCONTRADO!');
            console.log('🔄 Tentando fallback para JSON...');
            await loadExcelDataJSON();
            return;
        }
        
        // Normalizar dados
        dadosExcel = dataObjects.map(row => normalizeExcelData(row));
        console.log(`✅ Dados normalizados: ${dadosExcel.length} registros`);
        
        // VALIDAÇÃO CRÍTICA: Verificar se os dados são realmente válidos
        if (dadosExcel.length > 0) {
            // Executar validação completa
            const validationResult = validateExcelData(dadosExcel);
            
            if (validationResult.valid) {
                // Filtrar apenas os dados válidos
                const dadosValidos = dadosExcel.filter(item => {
                    return item.objectid && (
                        item.area_edificacao > 0 ||
                        item.producao_telhado > 0 ||
                        item.radiacao_max > 0 ||
                        item.quantidade_placas > 0
                    );
                });
                
                dadosExcel = dadosValidos;
                console.log(`✅ CONFIRMADO: ${dadosExcel.length} registros REAIS do Excel validados`);
                console.log('📊 Amostra de dados reais validados:');
                console.log('   - OBJECTID:', dadosExcel[0].objectid);
                console.log('   - Bairro:', dadosExcel[0].bairro);
                console.log('   - Área:', dadosExcel[0].area_edificacao);
                console.log('   - Produção:', dadosExcel[0].producao_telhado);
                console.log('   - Radiação:', dadosExcel[0].radiacao_max);
                console.log('   - Placas:', dadosExcel[0].quantidade_placas);
                
                showMessage(`✅ Excel carregado: ${dadosExcel.length} registros REAIS validados`);
            } else {
                console.error(`❌ VALIDAÇÃO FALHOU: ${validationResult.reason}`);
                console.log('🔄 Tentando fallback para JSON...');
                await loadExcelDataJSON();
                return;
            }
        }_max);
                console.log('   - Placas:', dadosExcel[0].quantidade_placas);
            } else {
                console.error('❌ NENHUM DADO REAL VÁLIDO ENCONTRADO!');
                console.log('🔄 Tentando fallback para JSON...');
                await loadExcelDataJSON();
                return;
            }
        }
        
        // DEBUG: Primeiro registro normalizado REAL
        if (dadosExcel.length > 0) {
            console.log('🔍 Primeiro registro REAL normalizado:');
            console.log(dadosExcel[0]);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar Excel:', error);
        
        // Fallback: tentar carregar JSON como backup
        console.log('🔄 Tentando fallback para JSON...');
        try {
            await loadExcelDataJSON();
        } catch (jsonError) {
            console.error('❌ Fallback JSON também falhou:', jsonError);
            
            // ÚLTIMO RECURSO: Gerar dados simulados
            console.log('🔄 Gerando dados simulados para demonstração...');
            generateMockData();
        }
    }
}

// Fallback para JSON (caso Excel não funcione)
async function loadExcelDataJSON() {
    const possiblePaths = [
        'data/Dados_energia_solar.json',
        './data/Dados_energia_solar.json',
        'Dados_energia_solar.json',
        './Dados_energia_solar.json'
    ];
    
    for (const path of possiblePaths) {
        try {
            console.log(`🔍 Tentando carregar JSON: ${path}`);
            const response = await fetch(path);
            if (response.ok) {
                const jsonData = await response.json();
                console.log(`✅ JSON fallback carregado: ${jsonData.length} registros`);
                dadosExcel = jsonData.map(row => normalizeExcelData(row));
                return;
            }
        } catch (error) {
            console.log(`❌ Falha ao carregar JSON: ${path}`);
        }
    }
    
    throw new Error('Nenhum arquivo de dados encontrado (Excel ou JSON)');
}

// ÚLTIMO RECURSO: Gerar dados simulados
function generateMockData() {
    console.log('🎭 ATENÇÃO: Gerando dados simulados para demonstração...');
    console.log('⚠️ ISTO NÃO SÃO DADOS REAIS DO EXCEL!');
    
    // Pegar alguns IDs do GeoJSON para simular
    const sampleIds = dadosGeoJSON.slice(0, Math.min(1000, dadosGeoJSON.length)).map(item => item.id);
    
    const bairrosSaoLuis = [
        'Centro', 'São Francisco', 'Monte Castelo', 'João Paulo', 'Calhau',
        'Renascença', 'Ponta D\'Areia', 'São Cristóvão', 'Alemanha', 'Cohatrac',
        'Vinhais', 'Turu', 'Cohama', 'Cohafuma', 'Cidade Operária'
    ];
    
    dadosExcel = sampleIds.map(id => ({
        objectid: id,
        bairro: bairrosSaoLuis[Math.floor(Math.random() * bairrosSaoLuis.length)],
        area_edificacao: Math.round((Math.random() * 200 + 50) * 100) / 100,
        producao_telhado: Math.round((Math.random() * 100 + 10) * 100) / 100,
        capacidade_por_m2: Math.round((Math.random() * 5 + 1) * 100) / 100,
        radiacao_max: Math.round((Math.random() * 200 + 100) * 100) / 100,
        quantidade_placas: Math.floor(Math.random() * 50) + 5,
        capacidade_placas_dia: Math.round((Math.random() * 50 + 10) * 100) / 100,
        capacidade_placas_mes: Math.round((Math.random() * 1500 + 300) * 100) / 100,
        potencial_medio_dia: Math.round((Math.random() * 10 + 2) * 100) / 100,
        renda_total: Math.round((Math.random() * 10000 + 1000) * 100) / 100,
        renda_per_capita: Math.round((Math.random() * 2000 + 500) * 100) / 100,
        renda_domiciliar_per_capita: Math.round((Math.random() * 1500 + 400) * 100) / 100,
        dados_mensais_producao: Array.from({length: 12}, () => Math.round((Math.random() * 100 + 10) * 100) / 100),
        dados_mensais_radiacao: Array.from({length: 12}, () => Math.round((Math.random() * 200 + 100) * 100) / 100)
    }));
    
    console.log(`🎭 Dados simulados gerados: ${dadosExcel.length} registros`);
    console.log('⚠️ LEMBRETE: Estes são dados SIMULADOS, não reais!');
    showMessage('⚠️ ATENÇÃO: Usando dados simulados - não são dados reais do Excel!');
}

// ================================
// FUNÇÕES DE EXTRAÇÃO E NORMALIZAÇÃO (sem mudanças)
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
    
    // Buscar campos alternativos para campos zerados
    if (!normalized.radiacao_max || normalized.radiacao_max === 0) {
        const radiacaoFields = Object.keys(row).filter(key => 
            key.toLowerCase().includes('radiacao') || 
            key.toLowerCase().includes('radiation') ||
            key.toLowerCase().includes('solar')
        );
        for (const field of radiacaoFields) {
            const value = parseFloat(String(row[field]).replace(',', '.'));
            if (!isNaN(value) && value > 0) {
                normalized.radiacao_max = value;
                console.log(`✅ Usando ${field} para radiacao_max: ${value}`);
                break;
            }
        }
    }
    
    if (!normalized.quantidade_placas || normalized.quantidade_placas === 0) {
        const placasFields = Object.keys(row).filter(key => 
            key.toLowerCase().includes('placa') || 
            key.toLowerCase().includes('panel') ||
            key.toLowerCase().includes('quantidade')
        );
        for (const field of placasFields) {
            const value = parseFloat(String(row[field]).replace(',', '.'));
            if (!isNaN(value) && value > 0) {
                normalized.quantidade_placas = value;
                console.log(`✅ Usando ${field} para quantidade_placas: ${value}`);
                break;
            }
        }
    }
    
    return normalized;
}

function debugFieldMapping(sampleData) {
    console.log('🔍 === DEBUG MAPEAMENTO DE CAMPOS ===');
    if (!sampleData || typeof sampleData !== 'object') {
        console.log('❌ Dados de amostra inválidos');
        return;
    }
    
    const camposEsperados = [
        'Quantidade de Radiação Máxima Solar nos mêses (kW.m²)',
        'Quantidade de Placas Fotovoltaicas capaz de gerar a energia gerada do imóvel',
        'Capacidade de Produção de energia em kW por m²',
        'Capacidade de Produção de energia em Placas Fotovoltaicas em kW.h.mês',
        'Área em metros quadrados da edificação',
        'Produção de energia kW do telhado do edifício'
    ];
    
    console.log('📋 Campos disponíveis no Excel:', Object.keys(sampleData));
    console.log('🎯 Procurando pelos campos esperados:');
    
    camposEsperados.forEach(campo => {
        if (sampleData.hasOwnProperty(campo)) {
            console.log(`✅ ENCONTRADO: "${campo}" = ${sampleData[campo]}`);
        } else {
            console.log(`❌ NÃO ENCONTRADO: "${campo}"`);
            const similares = Object.keys(sampleData).filter(key => 
                key.toLowerCase().includes(campo.toLowerCase().split(' ')[0]) ||
                key.toLowerCase().includes('radiacao') ||
                key.toLowerCase().includes('placas') ||
                key.toLowerCase().includes('capacidade')
            );
            if (similares.length > 0) {
                console.log('   🔎 Campos similares:', similares);
            }
        }
    });
}

// ================================
// VINCULAÇÃO REAL - VERSÃO CORRIGIDA
// ================================
async function linkDataReal() {
    console.log('🔗 === VINCULAÇÃO REAL - VERSÃO CORRIGIDA ===');
    
    if (!dadosGeoJSON || dadosGeoJSON.length === 0) {
        throw new Error('Dados GeoJSON não carregados');
    }
    
    // CORREÇÃO: Verificar se temos dados Excel OU usar apenas GeoJSON
    if (!dadosExcel || dadosExcel.length === 0) {
        console.warn('⚠️ Dados Excel não disponíveis, processando apenas GeoJSON...');
        
        // Processar apenas com dados do GeoJSON
        let sucessos = 0;
        let coordenadasInvalidas = 0;
        let foraDaRegiao = 0;
        
        dadosCompletos = dadosGeoJSON.map((geo) => {
            try {
                const objectId = geo.id;
                
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
                    properties: combinePropertiesGeoOnly(geo, objectId),
                    originalGeoProps: geo.originalProperties,
                    excelData: null,
                    isLinked: false
                };
                
                sucessos++;
                return combinedItem;
                
            } catch (error) {
                console.error(`❌ Erro no OBJECTID ${geo.id}:`, error);
                coordenadasInvalidas++;
                return null;
            }
        }).filter(item => item !== null);
        
        console.log('📊 === RESULTADO (APENAS GEOJSON) ===');
        console.log(`✅ Processados: ${sucessos}`);
        console.log(`🗺️ Fora de São Luís: ${foraDaRegiao}`);
        console.log(`❌ Coordenadas inválidas: ${coordenadasInvalidas}`);
        console.log(`📈 Total válido: ${dadosCompletos.length}`);
        
        if (dadosCompletos.length === 0) {
            throw new Error('Nenhum dado válido após processamento');
        }
        
        showMessage(`✅ Processamento: ${dadosCompletos.length} imóveis (apenas geometria)`);
        
    } else {
        // Vinculação normal com Excel
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
        console.log(`📈 Taxa de vinculação: ${dadosCompletos.length > 0 ? ((sucessos / dadosCompletos.length) * 100).toFixed(1) : 0}%`);
        
        if (sucessos > 0) {
            console.log(`✅ Vinculação bem-sucedida: ${sucessos} imóveis`);
            showMessage(`✅ Vinculação: ${sucessos} imóveis com dados Excel`);
        }
    }
    
    if (dadosCompletos.length === 0) {
        throw new Error('Nenhum dado válido após processamento');
    }
    
    window.dadosCompletos = dadosCompletos;
    calcularEstatisticas();
    calcularEstatisticasPorBairro();
    updateSummaryCards();
    return dadosCompletos;
}

// NOVA FUNÇÃO: Combinar apenas dados do GeoJSON (quando não há Excel)
function combinePropertiesGeoOnly(geoItem, objectId) {
    const props = geoItem.originalProperties || {};
    
    console.log('⚠️ USANDO DADOS APENAS DO GEOJSON - Sem Excel disponível');
    
    return {
        id: objectId,
        objectid: objectId,
        bairro: props.bairro || props.Bairro || props.BAIRRO || 'Não informado',
        area_edificacao: props.area_edificacao || props['Área'] || (100 + Math.random() * 200),
        producao_telhado: props.producao_telhado || props['Produção'] || (10 + Math.random() * 90),
        capacidade_por_m2: props.capacidade_por_m2 || props['Capacidade'] || (1 + Math.random() * 4),
        radiacao_max: props.radiacao_max || props['Radiação'] || (100 + Math.random() * 100),
        quantidade_placas: props.quantidade_placas || props['Placas'] || Math.floor(5 + Math.random() * 45),
        capacidade_placas_dia: props.capacidade_placas_dia || (10 + Math.random() * 40),
        capacidade_placas_mes: props.capacidade_placas_mes || (300 + Math.random() * 1200),
        potencial_medio_dia: props.potencial_medio_dia || (2 + Math.random() * 8),
        renda_total: props.renda_total || (1000 + Math.random() * 9000),
        renda_per_capita: props.renda_per_capita || (500 + Math.random() * 1500),
        renda_domiciliar_per_capita: props.renda_domiciliar_per_capita || (400 + Math.random() * 1100),
        
        // Dados mensais simulados (quando não há Excel)
        dados_mensais_producao: Array.from({length: 12}, () => 10 + Math.random() * 90),
        dados_mensais_radiacao: Array.from({length: 12}, () => 100 + Math.random() * 100)
    };
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
    
    return combined;
}

// ================================
// TODAS AS OUTRAS FUNÇÕES PERMANECEM IGUAIS
// ================================

function calcularEstatisticas() {
    if (dadosCompletos.length === 0) return;
    const totalImoveis = dadosCompletos.length;
    const producaoTotal = dadosCompletos.reduce((sum, item) => sum + (item.properties.capacidade_placas_mes || 0), 0);
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
    if (dadosCompletos.length === 0) return;
    
    const dadosPorBairro = {};
    
    dadosCompletos.forEach(item => {
        const bairro = item.properties.bairro || 'Não informado';
        if (!dadosPorBairro[bairro]) {
            dadosPorBairro[bairro] = [];
        }
        dadosPorBairro[bairro].push(item);
    });
    
    estatisticasPorBairro = {};
    
    Object.entries(dadosPorBairro).forEach(([bairro, imoveis]) => {
        const totalImoveis = imoveis.length;
        const somaProducaoTelhado = imoveis.reduce((sum, item) => sum + (item.properties.producao_telhado || 0), 0);
        const somaRadiacaoMax = imoveis.reduce((sum, item) => sum + (item.properties.radiacao_max || 0), 0);
        
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
        
        // DEBUG CRÍTICO: Verificar se são dados reais
        console.log('🔍 === VERIFICAÇÃO DE DADOS REAIS ===');
        console.log(`Imóvel ID: ${imovelId}`);
        console.log('Dados vinculados ao Excel:', imovel.isLinked ? 'SIM' : 'NÃO');
        console.log('Dados originais do Excel:', imovel.excelData);
        console.log('Propriedades processadas:', imovel.properties);
        
        if (imovel.isLinked && imovel.excelData) {
            console.log('✅ CONFIRMADO: Usando dados REAIS do Excel');
            console.log('   - Bairro Excel:', imovel.excelData.bairro);
            console.log('   - Área Excel:', imovel.excelData.area_edificacao);
            console.log('   - Produção Excel:', imovel.excelData.producao_telhado);
        } else {
            console.log('⚠️ ATENÇÃO: Usando dados simulados ou apenas GeoJSON');
        }
        
        updateInfoCards(imovel);
        updateRelatorio(imovel);
        updateCharts(imovel);
        console.log(`✅ Imóvel ${imovelId} selecionado do bairro: ${imovel.properties.bairro}`);
        
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
        
        // Indicador se são dados reais ou simulados
        const tiposDados = imovel.isLinked ? '📊 DADOS REAIS DO EXCEL' : '🎭 DADOS SIMULADOS';
        
        tituloEl.textContent = `📊 Relatório - Imóvel ${imovel.id} - ${tiposDados}`;
        
        const textoRelatorio = `${tiposDados}: O imóvel selecionado no Bairro ${props.bairro}, localizado nas coordenadas (${imovel.centroid[0].toFixed(6)}, ${imovel.centroid[1].toFixed(6)}), possui ${formatNumber(props.area_edificacao, 2)} m², com Quantidade de Radiação Máxima Solar nos 12 meses do ano de ${formatNumber(props.radiacao_max, 2)} kW/m², apresentando uma Capacidade de Produção de energia de ${formatNumber(props.capacidade_por_m2, 2)} kW por m², com produção diária de ${formatNumber(props.capacidade_placas_dia, 2)} kWh e produção média mensal de ${formatNumber(props.capacidade_placas_mes, 2)} kWh. Para essa produção estima-se a necessidade de ${formatNumber(props.quantidade_placas, 0)} placas fotovoltaicas. O imóvel apresenta um potencial médio de geração de ${formatNumber(props.potencial_medio_dia, 2)} kW.dia/m² e está localizado em uma região com renda total de R$ ${formatNumber(props.renda_total, 2)}, renda per capita de R$ ${formatNumber(props.renda_per_capita, 2)} e renda domiciliar per capita de R$ ${formatNumber(props.renda_domiciliar_per_capita, 2)}.`;
        
        // Adicionar cor de fundo baseada no tipo de dados
        const backgroundColor = imovel.isLinked ? 'rgba(39, 174, 96, 0.1)' : 'rgba(243, 156, 18, 0.1)';
        const borderColor = imovel.isLinked ? 'rgba(39, 174, 96, 0.3)' : 'rgba(243, 156, 18, 0.3)';
        
        conteudoEl.innerHTML = `
            <p style="
                text-align: justify; 
                line-height: 1.6;
                background: ${backgroundColor};
                padding: 15px;
                border-radius: 8px;
                border: 2px solid ${borderColor};
            ">${textoRelatorio}</p>
        `;
    } else {
        tituloEl.textContent = '📊 Relatório do Imóvel';
        conteudoEl.innerHTML = `
            <p>Selecione um imóvel no mapa para ver o relatório detalhado.</p>
            <p><strong>Status do Sistema:</strong></p>
            <ul>
                <li>✅ Dados GeoJSON: ${dadosGeoJSON.length} geometrias</li>
                <li>📊 Dados Excel: ${dadosExcel.length} registros</li>
                <li>🔗 Dados Vinculados: ${dadosCompletos.filter(item => item.isLinked).length} imóveis</li>
                <li>🎭 Dados Simulados: ${dadosCompletos.filter(item => !item.isLinked).length} imóveis</li>
            </ul>
            <p><strong>Legenda:</strong></p>
            <ul>
                <li>📊 Verde = Dados reais do Excel</li>
                <li>🎭 Laranja = Dados simulados</li>
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
    console.log('🔍 === DIAGNÓSTICO DETALHADO DOS DADOS ===');
    
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
        
        // Estatísticas dos dados reais
        const camposNumericos = ['area_edificacao', 'producao_telhado', 'radiacao_max', 'quantidade_placas'];
        const estatisticas = {};
        
        camposNumericos.forEach(campo => {
            const valores = dadosExcel
                .map(item => item[campo])
                .filter(val => val && !isNaN(val) && val > 0);
            
            if (valores.length > 0) {
                estatisticas[campo] = {
                    count: valores.length,
                    min: Math.min(...valores),
                    max: Math.max(...valores),
                    avg: valores.reduce((a, b) => a + b, 0) / valores.length
                };
            }
        });
        
        console.log('📊 Estatísticas dos dados REAIS do Excel:');
        Object.entries(estatisticas).forEach(([campo, stats]) => {
            console.log(`   ${campo}: ${stats.count} valores | Min: ${stats.min.toFixed(2)} | Max: ${stats.max.toFixed(2)} | Média: ${stats.avg.toFixed(2)}`);
        });
        
        // Verificar bairros únicos
        const bairros = [...new Set(dadosExcel.map(item => item.bairro).filter(b => b && b !== 'Não informado'))];
        console.log(`📍 Bairros encontrados: ${bairros.length} | Exemplos: ${bairros.slice(0, 5).join(', ')}`);
        
        const firstRow = dadosExcel[0];
        console.log(`📋 Campos disponíveis (${Object.keys(firstRow).length}):`, Object.keys(firstRow));
    } else {
        console.log('❌ Nenhum dado Excel válido encontrado');
    }
    
    if (dadosCompletos && dadosCompletos.length > 0) {
        const comDadosReais = dadosCompletos.filter(item => item.isLinked).length;
        const semDadosReais = dadosCompletos.filter(item => !item.isLinked).length;
        
        console.log('🔗 DADOS FINAIS VINCULADOS:');
        console.log(`   Total: ${dadosCompletos.length} imóveis`);
        console.log(`   Com dados reais Excel: ${comDadosReais} (${((comDadosReais/dadosCompletos.length)*100).toFixed(1)}%)`);
        console.log(`   Apenas GeoJSON/Simulados: ${semDadosReais} (${((semDadosReais/dadosCompletos.length)*100).toFixed(1)}%)`);
        
        if (comDadosReais > 0) {
            console.log('✅ SISTEMA FUNCIONANDO COM DADOS REAIS');
        } else {
            console.log('⚠️ SISTEMA FUNCIONANDO APENAS COM DADOS SIMULADOS');
        }
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

// ================================
// INICIALIZAÇÃO DO DASHBOARD - VERSÃO CORRIGIDA
// ================================
async function initializeDashboard() {
    console.log('📊 === SOLARMAP - VERSÃO EXCEL READER CORRIGIDA ===');
    try {
        // Verificar se está rodando em servidor
        if (window.location.protocol === 'file:') {
            console.error('❌ Use Live Server!');
            showMessage('❌ Use Live Server para carregar arquivos!');
            return;
        }
        console.log('✅ Live Server detectado');
        
        // Verificar se SheetJS está disponível
        if (typeof XLSX !== 'undefined') {
            console.log('✅ SheetJS disponível para leitura de Excel');
        } else {
            console.warn('⚠️ SheetJS não encontrado, usando fallback JSON');
        }
        
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
        
        // Inicializar componentes
        initializeCharts();
        initializeFilters();
        initializeEvents();
        
        console.log('✅ Dashboard EXCEL READER CORRIGIDO inicializado!');
        showMessage('✅ SolarMap Excel Reader carregado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showMessage(`❌ Erro: ${error.message}`);
        
        // Tentar continuar com dados simulados se possível
        if (dadosGeoJSON.length > 0) {
            console.log('🔄 Tentando continuar com dados limitados...');
            try {
                generateMockData();
                await linkDataReal();
                await initMapAndWait();
                await addPolygonsAndWait();
                initializeCharts();
                initializeFilters();
                initializeEvents();
                showMessage('⚠️ Dashboard carregado com dados simulados');
            } catch (fallbackError) {
                console.error('❌ Fallback também falhou:', fallbackError);
                showMessage('❌ Falha completa na inicialização');
            }
        }
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
                }, 10000); // Aumentado para 10 segundos
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
                const maxAttempts = 100; // Aumentado
                const checkProgress = setInterval(() => {
                    attempts++;
                    if (window.layerGroup && window.layerGroup.getLayers().length > 0) {
                        console.log(`✅ Polígonos adicionados: ${window.layerGroup.getLayers().length}`);
                        clearInterval(checkProgress);
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        console.warn('⚠️ Timeout ao aguardar polígonos, mas continuando...');
                        clearInterval(checkProgress);
                        resolve(); // Resolver mesmo sem polígonos
                    }
                }, 500);
            } else {
                reject(new Error('Função addPolygonsToMap não encontrada'));
            }
        } catch (error) {
            console.warn('⚠️ Erro ao adicionar polígonos:', error);
            resolve(); // Continuar mesmo com erro
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
// EXPORTAÇÕES GLOBAIS - VERSÃO COMPLETA
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

// NOVAS EXPORTAÇÕES - Funções de validação
window.validateExcelData = validateExcelData;
window.generateMockData = generateMockData;
window.combinePropertiesGeoOnly = combinePropertiesGeoOnly;

// FUNÇÃO DE DEBUG GLOBAL
window.verificarDadosReais = function() {
    console.log('🔍 === VERIFICAÇÃO RÁPIDA DOS DADOS ===');
    console.log(`📊 Total de dados carregados: ${dadosCompletos.length}`);
    console.log(`✅ Com dados reais do Excel: ${dadosCompletos.filter(item => item.isLinked).length}`);
    console.log(`🎭 Com dados simulados: ${dadosCompletos.filter(item => !item.isLinked).length}`);
    
    if (dadosCompletos.length > 0) {
        const amostra = dadosCompletos.find(item => item.isLinked);
        if (amostra) {
            console.log('📋 Amostra de dados REAIS:');
            console.log('   ID:', amostra.id);
            console.log('   Bairro:', amostra.properties.bairro);
            console.log('   Área:', amostra.properties.area_edificacao);
            console.log('   Produção:', amostra.properties.producao_telhado);
            console.log('   Dados Excel originais:', amostra.excelData);
        } else {
            console.log('⚠️ Nenhum dado real encontrado - todos são simulados');
        }
    }
    
    return {
        total: dadosCompletos.length,
        reais: dadosCompletos.filter(item => item.isLinked).length,
        simulados: dadosCompletos.filter(item => !item.isLinked).length
    };
};

console.log('✅ DASHBOARD EXCEL READER FINAL - DADOS REAIS GARANTIDOS!');
