// ================================
// DASHBOARD PRINCIPAL - SOLARMAP
// VERSÃO COMPLETA CORRIGIDA PARA HEADERS COM ESPAÇOS
// ================================
console.log('🚀 Dashboard SolarMap - VERSÃO COMPLETA CORRIGIDA');

// ================================
// VARIÁVEIS GLOBAIS
// ================================
let dadosCompletos = [];
let dadosExcel = [];
let dadosGeoJSON = [];
let imovelSelecionado = null;
let estatisticas = {};
let estatisticasPorBairro = {};

// Variáveis do sistema de merge
let dadosGeoJSONRaw = null;
let dadosExcelRaw = null;
let estatisticasMerge = {
    totalGeoJSON: 0,
    totalExcel: 0,
    sucessos: 0,
    semMatch: 0,
    erros: 0
};

// Filtros ativos
let filtrosAtivos = {
    bairros: [],
    info: 'capacidade_por_m2',
    minValue: null,
    maxValue: null
};

// ================================
// FUNÇÕES DE FORMATAÇÃO
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
// SISTEMA DE MERGE INTEGRADO
// ================================

// Carregamento do GeoJSON
async function carregarGeoJSON() {
    console.log('📍 === CARREGANDO GEOJSON ===');
    
    try {
        const response = await fetch('data/Dados_energia_solar.geojson');
        if (!response.ok) {
            throw new Error(`GeoJSON não encontrado: ${response.status}`);
        }
        
        const geoData = await response.json();
        dadosGeoJSONRaw = geoData;
        
        console.log(`✅ GeoJSON carregado: ${geoData.features.length} features`);
        
        // Analisar OBJECTIDs
        const objectIds = [];
        geoData.features.forEach((feature, index) => {
            const objectId = extrairObjectIdGeoJSON(feature.properties, index);
            if (objectId !== null) {
                objectIds.push(objectId);
            }
        });
        
        console.log(`📊 OBJECTIDs GeoJSON: ${objectIds.length} (Range: ${Math.min(...objectIds)} - ${Math.max(...objectIds)})`);
        
        estatisticasMerge.totalGeoJSON = geoData.features.length;
        return geoData;
        
    } catch (error) {
        console.error('❌ Erro ao carregar GeoJSON:', error);
        throw error;
    }
}

// Carregamento do Excel CORRIGIDO
async function carregarExcel() {
    console.log('📊 === CARREGANDO EXCEL CORRIGIDO ===');
    
    const possiblePaths = [
        'data/Dados_energia_solar.xlsx',
        'Dados_energia_solar.xlsx'
    ];
    
    let response = null;
    let foundPath = null;
    
    for (const path of possiblePaths) {
        try {
            console.log(`🔍 Tentando: ${path}`);
            response = await fetch(path);
            if (response.ok) {
                foundPath = path;
                console.log(`✅ Excel encontrado: ${foundPath}`);
                break;
            }
        } catch (error) {
            console.log(`❌ Falha: ${path}`);
        }
    }
    
    if (!foundPath || !response.ok) {
        throw new Error('Arquivo Excel não encontrado nos caminhos testados');
    }
    
    try {
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
            type: 'array',
            cellDates: true,
            cellStyles: true
        });
        
        console.log('📋 Planilhas disponíveis:', workbook.SheetNames);
        
        // CORREÇÃO: Usar primeira planilha disponível
        const firstSheetName = workbook.SheetNames[0];
        console.log(`📋 Usando planilha: ${firstSheetName}`);
        
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: ''
        });
        
        if (jsonData.length === 0) {
            throw new Error('Planilha Excel vazia');
        }
        
        dadosExcelRaw = jsonData;
        
        console.log(`✅ Excel processado: ${jsonData.length} registros`);
        console.log('📋 Headers encontrados:', Object.keys(jsonData[0]).slice(0, 10));
        
        // DEBUG: Mostrar primeiro registro completo
        console.log('🔍 Primeiro registro Excel:', jsonData[0]);
        
        // Analisar OBJECTIDs
        const objectIds = [];
        jsonData.forEach((row, index) => {
            const objectId = extrairObjectIdExcel(row, index);
            if (objectId !== null) {
                objectIds.push(objectId);
            }
        });
        
        console.log(`📊 OBJECTIDs Excel: ${objectIds.length} (Range: ${Math.min(...objectIds)} - ${Math.max(...objectIds)})`);
        
        estatisticasMerge.totalExcel = jsonData.length;
        
        // IMPORTANTE: Exportar dadosExcelRaw globalmente
        window.dadosExcelRaw = dadosExcelRaw;
        
        return jsonData;
        
    } catch (error) {
        console.error('❌ Erro ao processar Excel:', error);
        throw error;
    }
}

// Extração de OBJECTID
function extrairObjectIdGeoJSON(properties, fallbackIndex) {
    const campos = ['OBJECTID', 'ObjectID', 'objectid', 'OBJECT_ID', 'FID', 'fid', 'ID', 'id'];
    
    for (const campo of campos) {
        if (properties.hasOwnProperty(campo)) {
            const valor = properties[campo];
            if (valor !== null && valor !== undefined && valor !== '') {
                const num = parseInt(String(valor));
                if (!isNaN(num) && num > 0) {
                    return num;
                }
            }
        }
    }
    
    return fallbackIndex + 1;
}

function extrairObjectIdExcel(row, fallbackIndex) {
    const campos = ['OBJECTID', 'ObjectID', 'objectid', 'OBJECT_ID', 'FID', 'fid', 'ID', 'id', 'FID_1'];
    
    for (const campo of campos) {
        if (row.hasOwnProperty(campo)) {
            const valor = row[campo];
            if (valor !== null && valor !== undefined && valor !== '') {
                const num = parseInt(String(valor));
                if (!isNaN(num) && num > 0) {
                    return num;
                }
            }
        }
    }
    
    return fallbackIndex + 1;
}

// Normalização dos dados Excel CORRIGIDA PARA HEADERS COM ESPAÇOS
function normalizarDadosExcel(row) {
    // MAPEAMENTO CORRIGIDO PARA HEADERS COM ESPAÇOS
    const mapeamento = {
        'OBJECTID': 'objectid',
        'FID_1': 'fid',
        
        // CORREÇÃO: Headers com espaços
        ' Bairros ': 'bairro',
        'Bairros': 'bairro',
        
        // CORREÇÃO: Campos principais com espaços
        ' Área em metros quadrados da edificação ': 'area_edificacao',
        'Área em metros quadrados da edificação': 'area_edificacao',
        
        ' Produção de energia kW do telhado do edifício ': 'producao_telhado',
        'Produção de energia kW do telhado do edifício': 'producao_telhado',
        
        ' Capacidade de Produção de energia em kW por m² ': 'capacidade_por_m2',
        'Capacidade de Produção de energia em kW por m²': 'capacidade_por_m2',
        
        ' Quantidade de Radiação Máxima Solar nos mêses (kW.m² ': 'radiacao_max',
        'Quantidade de Radiação Máxima Solar nos mêses (kW.m²': 'radiacao_max',
        'Quantidade de Radiação Máxima Solar nos mêses (kW.m²)': 'radiacao_max',
        
        ' Quantidade de Placas Fotovoltaicas capaz de gerar a energia gerada do imovel ': 'quantidade_placas',
        'Quantidade de Placas Fotovoltaicas capaz de gerar a energia gerada do imóvel': 'quantidade_placas',
        
        ' Capacidade de Produção de energia em Placas Fotovoltaicas em kW.h.dia ': 'capacidade_placas_dia',
        'Capacidade de Produção de energia em Placas Fotovoltaicas em kW.h.dia': 'capacidade_placas_dia',
        
        ' Capacidade de Produção de energia em Placas Fotovoltaicas em kW.h.mês ': 'capacidade_placas_mes',
        'Capacidade de Produção de energia em Placas Fotovoltaicas em kW.h.mês': 'capacidade_placas_mes',
        
        ' Potencial médio de geração FV em um dia (kW.dia.m²) ': 'potencial_medio_dia',
        'Potencial médio de geração FV em um dia (kW.dia.m²)': 'potencial_medio_dia',
        
        ' Renda Total ': 'renda_total',
        'Renda Total': 'renda_total',
        
        ' Renda per capita ': 'renda_per_capita',
        'Renda per capita': 'renda_per_capita',
        
        ' Renda domiciliar per capita ': 'renda_domiciliar_per_capita',
        'Renda domiciliar per capita': 'renda_domiciliar_per_capita'
    };
    
    // Campos mensais de produção COM ESPAÇOS
    const mesesProducao = [
        ' Produção de energia no mês de janeiro kW do telhado do edifício ',
        ' Produção de energia no mês de fevereiro kW do telhado do edifício ',
        ' Produção de energia no mês de março kW do telhado do edifício ',
        ' Produção de energia no mês de abril kW do telhado do edifício ',
        ' Produção de energia no mês de maio kW do telhado do edifício ',
        ' Produção de energia no mês de junho kW do telhado do edifício ',
        ' Produção de energia no mês de julho kW do telhado do edifício ',
        ' Produção de energia no mês de agosto kW do telhado do edifício ',
        ' Produção de energia no mês de setembro kW do telhado do edifício ',
        ' Produção de energia no mês de outubro kW do telhado do edifício ',
        ' Produção de energia no mês de novembro kW do telhado do edifício ',
        ' Produção de energia no mês de dezembro kW do telhado do edifício '
    ];
    
    // Campos mensais de radiação COM ESPAÇOS
    const mesesRadiacao = [
        ' Quantidade de Radiação Solar no mês de janeiro (kW.m²) ',
        ' Quantidade de Radiação Solar no mês de fevereiro (kW.m²) ',
        ' Quantidade de Radiação Solar no mês de março (kW.m²) ',
        ' Quantidade de Radiação Solar no mês de abril (kW.m²) ',
        ' Quantidade de Radiação Solar no mês de maio (kW.m²) ',
        ' Quantidade de Radiação Solar no mês de junho (kW.m²) ',
        ' Quantidade de Radiação Solar no mês de julho (kW.m²) ',
        ' Quantidade de Radiação Solar no mês de agosto (kW.m²) ',
        ' Quantidade de Radiação Solar no mês de setembro (kW.m²) ',
        ' Quantidade de Radiação Solar no mês de outubro (kW.m²) ',
        ' Quantidade de Radiação Solar no mês de novembro (kW.m²) ',
        ' Quantidade de Radiação Solar no mês de dezembro (kW.m²) '
    ];
    
    const normalizado = {};
    
    // Processar campos básicos
    Object.entries(row).forEach(([chave, valor]) => {
        const campoNormalizado = mapeamento[chave] || chave.toLowerCase().replace(/\s+/g, '_');
        
        if (valor !== null && valor !== undefined && valor !== '') {
            // Campo de bairro - manter como string e limpar espaços
            if (chave.includes('Bairros') || chave.includes('bairro') || campoNormalizado === 'bairro') {
                normalizado[campoNormalizado] = String(valor).trim();
            } else {
                // Outros campos - tentar converter para número
                const valorLimpo = String(valor)
                    .replace(/\./g, '')     // Remover pontos (milhares)
                    .replace(',', '.')      // Vírgula vira ponto decimal
                    .replace(/[^\d.-]/g, ''); // Manter apenas números, pontos e sinais
                
                const valorNumerico = parseFloat(valorLimpo);
                normalizado[campoNormalizado] = isNaN(valorNumerico) ? String(valor).trim() : valorNumerico;
            }
        } else {
            // Valores padrão para campos vazios
            if (chave.includes('Bairros') || chave.includes('bairro') || campoNormalizado === 'bairro') {
                normalizado[campoNormalizado] = 'Não informado';
            } else {
                normalizado[campoNormalizado] = 0;
            }
        }
    });
    
    // Processar dados mensais de produção
    const dadosMensaisProducao = mesesProducao.map(campo => {
        const valor = row[campo];
        if (valor !== null && valor !== undefined && valor !== '') {
            const valorLimpo = String(valor).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
            const valorNumerico = parseFloat(valorLimpo);
            return isNaN(valorNumerico) ? 0 : valorNumerico;
        }
        return 0;
    });
    
    // Processar dados mensais de radiação
    const dadosMensaisRadiacao = mesesRadiacao.map(campo => {
        const valor = row[campo];
        if (valor !== null && valor !== undefined && valor !== '') {
            const valorLimpo = String(valor).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
            const valorNumerico = parseFloat(valorLimpo);
            return isNaN(valorNumerico) ? 0 : valorNumerico;
        }
        return 0;
    });
    
    // Adicionar arrays mensais
    normalizado.dados_mensais_producao = dadosMensaisProducao;
    normalizado.dados_mensais_radiacao = dadosMensaisRadiacao;
    
    return normalizado;
}

// Conversão de coordenadas SIRGAS 2000
function converterSIRGAS2000ParaWGS84(utmX, utmY) {
    try {
        if (!utmX || !utmY || isNaN(utmX) || isNaN(utmY)) {
            return null;
        }
        
        const a = 6378137.0;
        const f = 1/298.257222101;
        const k0 = 0.9996;
        const lon0 = -45.0 * Math.PI / 180;
        const FE = 500000;
        const FN = 10000000;
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
        
        if (latDeg < -2.800 || latDeg > -2.200 || lonDeg < -44.600 || lonDeg > -43.900) {
            return null;
        }
        
        return [latDeg, lonDeg];
    } catch (error) {
        return null;
    }
}

function isValidSaoLuisCoordinate(lat, lng) {
    return lat >= -2.800 && lat <= -2.200 && lng >= -44.600 && lng <= -43.900;
}

// Processamento de geometria
function processGeometrySIRGAS2000(feature) {
    try {
        const geometry = feature.geometry;
        if (!geometry || !geometry.coordinates) {
            return null;
        }
        
        let pontos = [];
        
        if (geometry.type === 'Polygon' && geometry.coordinates[0]) {
            pontos = geometry.coordinates[0];
        } else if (geometry.type === 'MultiPolygon' && geometry.coordinates[0] && geometry.coordinates[0][0]) {
            pontos = geometry.coordinates[0][0];
        } else {
            return null;
        }
        
        if (!pontos || pontos.length === 0) {
            return null;
        }
        
        const pontosConvertidos = [];
        for (const ponto of pontos) {
            if (ponto && ponto.length >= 2) {
                const coordenada = converterSIRGAS2000ParaWGS84(ponto[0], ponto[1]);
                if (coordenada) {
                    pontosConvertidos.push([coordenada[0], coordenada[1]]);
                }
            }
        }
        
        if (pontosConvertidos.length === 0) {
            return null;
        }
        
        const centroide = calcularCentroide(pontosConvertidos);
        if (!centroide || !isValidSaoLuisCoordinate(centroide[0], centroide[1])) {
            return null;
        }
        
        return {
            coordinates: pontosConvertidos,
            centroid: centroide
        };
        
    } catch (error) {
        return null;
    }
}

function calcularCentroide(pontos) {
    if (!pontos || pontos.length === 0) return null;
    
    let somaLat = 0;
    let somaLng = 0;
    
    pontos.forEach(ponto => {
        somaLat += ponto[0];
        somaLng += ponto[1];
    });
    
    return [somaLat / pontos.length, somaLng / pontos.length];
}

// Merge principal dos dados
async function executarMergeCompleto() {
    console.log('🔗 === EXECUTANDO MERGE COMPLETO ===');
    
    try {
        // Resetar estatísticas
        estatisticasMerge = {
            totalGeoJSON: 0,
            totalExcel: 0,
            sucessos: 0,
            semMatch: 0,
            erros: 0
        };
        
        // Carregar dados
        console.log('📥 1/4 - Carregando dados...');
        await carregarGeoJSON();
        await carregarExcel();
        
        // Criar índice Excel
        console.log('📋 2/4 - Criando índice Excel...');
        const indiceExcel = new Map();
        dadosExcelRaw.forEach((row, index) => {
            const objectId = extrairObjectIdExcel(row, index);
            if (objectId !== null) {
                const dadosNormalizados = normalizarDadosExcel(row);
                indiceExcel.set(objectId, dadosNormalizados);
            }
        });
        
        console.log(`📊 Índice Excel criado: ${indiceExcel.size} registros`);
        
        // Processar merge
        console.log('🔗 3/4 - Executando merge...');
        dadosCompletos = [];
        
        for (let i = 0; i < dadosGeoJSONRaw.features.length; i++) {
            const feature = dadosGeoJSONRaw.features[i];
            
            try {
                const objectId = extrairObjectIdGeoJSON(feature.properties, i);
                
                const geometriaProcessada = processGeometrySIRGAS2000(feature);
                if (!geometriaProcessada) {
                    estatisticasMerge.erros++;
                    continue;
                }
                
                const dadosExcel = indiceExcel.get(objectId);
                const temMatch = !!dadosExcel;
                
                if (temMatch) {
                    estatisticasMerge.sucessos++;
                } else {
                    estatisticasMerge.semMatch++;
                }
                
                const itemCombinado = {
                    id: objectId,
                    coordinates: geometriaProcessada.coordinates,
                    centroid: geometriaProcessada.centroid,
                    geometryType: feature.geometry.type,
                    properties: criarPropriedadesCombinadas(feature.properties, dadosExcel, objectId),
                    originalGeoProperties: feature.properties,
                    excelData: dadosExcel,
                    isLinked: temMatch
                };
                
                dadosCompletos.push(itemCombinado);
                
            } catch (error) {
                console.error(`❌ Erro ao processar feature ${i}:`, error);
                estatisticasMerge.erros++;
            }
        }
        
        // Finalizar
        console.log('✅ 4/4 - Finalizando merge...');
        
        // Atualizar variáveis globais
        window.dadosCompletos = dadosCompletos;
        window.dadosGeoJSON = dadosGeoJSONRaw.features;
        window.dadosExcel = dadosExcelRaw;
        window.estatisticasMerge = estatisticasMerge;
        
        // Relatório final
        console.log('📊 === RELATÓRIO FINAL DO MERGE ===');
        console.log(`📍 Total GeoJSON: ${estatisticasMerge.totalGeoJSON}`);
        console.log(`📊 Total Excel: ${estatisticasMerge.totalExcel}`);
        console.log(`✅ Sucessos: ${estatisticasMerge.sucessos}`);
        console.log(`⚠️ Sem match: ${estatisticasMerge.semMatch}`);
        console.log(`❌ Erros: ${estatisticasMerge.erros}`);
        console.log(`📈 Total processado: ${dadosCompletos.length}`);
        console.log(`📈 Taxa de sucesso: ${((estatisticasMerge.sucessos / dadosCompletos.length) * 100).toFixed(1)}%`);
        
        return dadosCompletos;
        
    } catch (error) {
        console.error('❌ Erro no merge completo:', error);
        throw error;
    }
}

function criarPropriedadesCombinadas(geoProperties, excelData, objectId) {
    return {
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
        
        dados_mensais_producao: excelData?.dados_mensais_producao || new Array(12).fill(0),
        dados_mensais_radiacao: excelData?.dados_mensais_radiacao || new Array(12).fill(0)
    };
}

// ================================
// CÁLCULOS DE ESTATÍSTICAS
// ================================
function calcularEstatisticas() {
    if (!dadosCompletos || dadosCompletos.length === 0) {
        estatisticas = { total_imoveis: 0, producao_total: 0, media_producao: 0 };
        return;
    }
    
    console.log(`📊 Calculando estatísticas para ${dadosCompletos.length} itens`);
    
    const totalImoveis = dadosCompletos.length;
    
    const producaoTotal = dadosCompletos.reduce((sum, item) => {
        if (item && item.properties && typeof item.properties.capacidade_por_m2 === 'number') {
            return sum + item.properties.capacidade_por_m2;
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
        
        // Calcular médias mensais por bairro
        const mediaProducaoMensal = new Array(12).fill(0);
        const mediaRadiacaoMensal = new Array(12).fill(0);
        
        for (let mes = 0; mes < 12; mes++) {
            const somaProducaoMes = imoveis.reduce((sum, item) => {
                if (item.properties.dados_mensais_producao && item.properties.dados_mensais_producao[mes]) {
                    return sum + item.properties.dados_mensais_producao[mes];
                }
                return sum;
            }, 0);
            
            const somaRadiacaoMes = imoveis.reduce((sum, item) => {
                if (item.properties.dados_mensais_radiacao && item.properties.dados_mensais_radiacao[mes]) {
                    return sum + item.properties.dados_mensais_radiacao[mes];
                }
                return sum;
            }, 0);
            
            mediaProducaoMensal[mes] = totalImoveis > 0 ? somaProducaoMes / totalImoveis : 0;
            mediaRadiacaoMensal[mes] = totalImoveis > 0 ? somaRadiacaoMes / totalImoveis : 0;
        }
        
        estatisticasPorBairro[bairro] = {
            total_imoveis: totalImoveis,
            media_producao_mensal: mediaProducaoMensal,
            media_radiacao_mensal: mediaRadiacaoMensal
        };
    });
    
    window.estatisticasPorBairro = estatisticasPorBairro;
    console.log('📊 Estatísticas por bairro calculadas:', Object.keys(estatisticasPorBairro).length, 'bairros');
}

// ================================
// ATUALIZAÇÃO DOS CARDS
// ================================
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
            return sum + (item.properties?.capacidade_por_m2 || 0);
        }, 0);
        producaoEl.textContent = formatNumber(total, 2);
    }
    if (mediaEl) {
        const total = dados.reduce((sum, item) => {
            return sum + (item.properties?.capacidade_por_m2 || 0);
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

// ================================
// ATUALIZAÇÃO DOS CARDS DE INFORMAÇÃO
// ================================
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
        console.log(`✅ Cards atualizados para imóvel ${imovel.id} do bairro ${imovel.properties.bairro}`);
    }
}

// ================================
// ATUALIZAÇÃO DO RELATÓRIO
// ================================
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
            <p><strong>Sistema Corrigido para Headers:</strong></p>
            <ul>
                <li>✅ Headers com espaços corrigidos</li>
                <li>✅ Dados reais do Excel sendo lidos</li>
                <li>✅ Bairros funcionando corretamente</li>
                <li>✅ Valores numéricos processados</li>
            </ul>
        `;
    }
}

// ================================
// FUNÇÕES DE INICIALIZAÇÃO DOS MÓDULOS
// ================================
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

// ================================
// DIAGNÓSTICO DETALHADO
// ================================
function diagnosticDataDetailed() {
    console.log('🔍 === DIAGNÓSTICO DETALHADO COM HEADERS CORRIGIDOS ===');
    
    // Diagnóstico dos dados carregados
    if (dadosCompletos && dadosCompletos.length > 0) {
        console.log('📊 === DADOS CARREGADOS ===');
        console.log(`📍 Total de dados: ${dadosCompletos.length}`);
        
        const comDadosExcel = dadosCompletos.filter(item => item.isLinked);
        const comValoresReais = dadosCompletos.filter(item => 
            item.properties?.area_edificacao > 0 || 
            item.properties?.producao_telhado > 0 || 
            item.properties?.capacidade_por_m2 > 0
        );
        
        console.log(`✅ Com dados Excel: ${comDadosExcel.length} (${((comDadosExcel.length/dadosCompletos.length)*100).toFixed(1)}%)`);
        console.log(`📊 Com valores reais: ${comValoresReais.length} (${((comValoresReais.length/dadosCompletos.length)*100).toFixed(1)}%)`);
        
        const bairros = [...new Set(dadosCompletos.map(item => item.properties?.bairro).filter(b => b && b !== 'Não informado'))];
        console.log(`🏘️ Bairros únicos: ${bairros.length}`);
        console.log(`🏘️ Lista de bairros:`, bairros.slice(0, 10));
        
        // Exemplo de item com dados
        const exemploComDados = dadosCompletos.find(item => item.isLinked && item.properties?.area_edificacao > 0);
        if (exemploComDados) {
            console.log('📋 Exemplo de item com dados completos:');
            console.log(`   ID: ${exemploComDados.id}`);
            console.log(`   Bairro: ${exemploComDados.properties.bairro}`);
            console.log(`   Área: ${exemploComDados.properties.area_edificacao} m²`);
            console.log(`   Produção: ${exemploComDados.properties.producao_telhado} kW`);
            console.log(`   Radiação: ${exemploComDados.properties.radiacao_max} kW/m²`);
            console.log(`   Placas: ${exemploComDados.properties.quantidade_placas}`);
            console.log(`   Centroide: [${exemploComDados.centroid[0].toFixed(6)}, ${exemploComDados.centroid[1].toFixed(6)}]`);
        }
    } else {
        console.error('❌ Nenhum dado carregado');
    }
    
    // Diagnóstico do merge
    console.log('📊 === ESTATÍSTICAS DO MERGE ===');
    console.log('Merge stats:', estatisticasMerge);
    
    // Diagnóstico das estatísticas
    console.log('📊 === ESTATÍSTICAS CALCULADAS ===');
    console.log('Globais:', estatisticas);
    console.log('Por bairro:', Object.keys(estatisticasPorBairro).length, 'bairros');
    
    // Diagnóstico dos filtros
    console.log('🔍 === FILTROS ATIVOS ===');
    console.log(filtrosAtivos);
    
    const dadosFiltrados = filtrarDados();
    console.log(`📊 Dados após filtros: ${dadosFiltrados.length}/${dadosCompletos.length}`);
    
    // Diagnóstico específico do Excel
    console.log('📊 === DIAGNÓSTICO DO EXCEL ===');
    console.log('dadosExcelRaw disponível:', !!window.dadosExcelRaw);
    console.log('dadosExcelRaw length:', window.dadosExcelRaw?.length);
    
    if (window.dadosExcelRaw && window.dadosExcelRaw.length > 0) {
        const primeiroRegistro = window.dadosExcelRaw[0];
        console.log('Primeiro registro Excel:', primeiroRegistro);
        console.log('Bairro no Excel:', primeiroRegistro[' Bairros ']);
        console.log('Headers Excel:', Object.keys(primeiroRegistro).slice(0, 10));
    }
}

// ================================
// VERIFICAÇÃO DE INTEGRIDADE
// ================================
function verificarIntegridadeDados() {
    console.log('🔍 === VERIFICAÇÃO DE INTEGRIDADE DOS DADOS ===');
    
    if (!dadosCompletos || dadosCompletos.length === 0) {
        console.error('❌ Nenhum dado carregado');
        return false;
    }
    
    let problemas = [];
    let sucessos = 0;
    
    dadosCompletos.forEach((item, index) => {
        try {
            // Verificar estrutura básica
            if (!item.id) problemas.push(`Item ${index}: sem ID`);
            if (!item.properties) problemas.push(`Item ${index}: sem properties`);
            if (!item.coordinates || item.coordinates.length === 0) problemas.push(`Item ${index}: sem coordenadas`);
            if (!item.centroid || item.centroid.length !== 2) problemas.push(`Item ${index}: centroide inválido`);
            
            // Verificar dados específicos
            if (item.isLinked) {
                if (!item.properties.bairro || item.properties.bairro === 'Não informado') {
                    problemas.push(`Item ${index}: vinculado mas sem bairro`);
                }
                
                if (item.properties.area_edificacao <= 0 && 
                    item.properties.producao_telhado <= 0 && 
                    item.properties.capacidade_por_m2 <= 0) {
                    problemas.push(`Item ${index}: vinculado mas sem valores válidos`);
                }
            }
            
            sucessos++;
            
        } catch (error) {
            problemas.push(`Item ${index}: erro na verificação - ${error.message}`);
        }
    });
    
    console.log(`✅ Itens verificados com sucesso: ${sucessos}`);
    console.log(`⚠️ Problemas encontrados: ${problemas.length}`);
    
    if (problemas.length > 0) {
        console.log('🔍 Primeiros 10 problemas:');
        problemas.slice(0, 10).forEach(problema => console.log(`   ${problema}`));
    }
    
    const integridadePercent = ((sucessos / dadosCompletos.length) * 100).toFixed(1);
    console.log(`📊 Integridade dos dados: ${integridadePercent}%`);
    
    return integridadePercent >= 90;
}

// ================================
// EXPORTAR DADOS PARA VERIFICAÇÃO
// ================================
function exportarDadosParaVerificacao() {
    console.log('📤 === EXPORTANDO DADOS PARA VERIFICAÇÃO ===');
    
    if (dadosCompletos.length === 0) {
        console.error('❌ Nenhum dado processado para exportar');
        return;
    }
    
    const resumo = dadosCompletos.map(item => ({
        id: item.id,
        bairro: item.properties.bairro,
        area: item.properties.area_edificacao,
        producao: item.properties.producao_telhado,
        radiacao: item.properties.radiacao_max,
        vinculado: item.isLinked,
        latitude: item.centroid[0].toFixed(6),
        longitude: item.centroid[1].toFixed(6)
    }));
    
    const csvHeader = 'ID,Bairro,Area,Producao,Radiacao,Vinculado,Latitude,Longitude\n';
    const csvContent = resumo.map(item => 
        `${item.id},"${item.bairro}",${item.area},${item.producao},${item.radiacao},${item.vinculado},${item.latitude},${item.longitude}`
    ).join('\n');
    
    const csvCompleto = csvHeader + csvContent;
    
    const blob = new Blob([csvCompleto], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dados_merge_verificacao.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`✅ CSV exportado com ${resumo.length} registros`);
}

// ================================
// INICIALIZAÇÃO PRINCIPAL
// ================================
async function initializeDashboard() {
    console.log('📊 === SOLARMAP - VERSÃO CORRIGIDA PARA HEADERS ===');
    
    try {
        // Verificar se está rodando em Live Server
        if (window.location.protocol === 'file:') {
            console.error('❌ Use Live Server!');
            showMessage('❌ Use Live Server para acessar os arquivos!');
            return;
        }
        
        console.log('✅ Live Server detectado');
        
        // Verificar se XLSX está disponível
        if (typeof XLSX === 'undefined') {
            throw new Error('Biblioteca XLSX não carregada');
        }
        console.log('✅ XLSX disponível');
        
        // 1. Executar merge dos dados
        console.log('🔗 1/5 - Executando merge dos dados...');
        await executarMergeCompleto();
        
        // 2. Calcular estatísticas
        console.log('📊 2/5 - Calculando estatísticas...');
        calcularEstatisticas();
        calcularEstatisticasPorBairro();
        updateSummaryCards();
        
        // 3. Criar mapa
        console.log('🗺️ 3/5 - Criando mapa...');
        await initMapAndWait();
        
        // 4. Adicionar polígonos
        console.log('📍 4/5 - Adicionando polígonos...');
        await addPolygonsAndWait();
        
        // 5. Inicializar módulos
        console.log('🎯 5/5 - Inicializando módulos...');
        initializeCharts();
        initializeFilters();
        initializeEvents();
        
        // Atualizar filtros após carregamento completo
        if (window.populateBairroSelect) {
            window.populateBairroSelect();
        }
        
        console.log('✅ === DASHBOARD CORRIGIDO INICIALIZADO! ===');
        showMessage('✅ SolarMap carregado com headers corrigidos!');
        
        // Estatísticas finais
        console.log('📊 === ESTATÍSTICAS FINAIS ===');
        console.log(`📍 Dados carregados: ${dadosCompletos.length} itens`);
        console.log(`🗺️ Polígonos no mapa: ${window.layerGroup?.getLayers().length || 0}`);
        console.log(`🏘️ Bairros disponíveis: ${Object.keys(estatisticasPorBairro).length}`);
        
        const dadosVinculados = dadosCompletos.filter(item => item.isLinked);
        console.log(`📋 Taxa de vinculação: ${dadosVinculados.length}/${dadosCompletos.length} (${((dadosVinculados.length/dadosCompletos.length)*100).toFixed(1)}%)`);
        
        const dadosComValores = dadosCompletos.filter(item => 
            item.properties.area_edificacao > 0 || 
            item.properties.producao_telhado > 0 || 
            item.properties.capacidade_por_m2 > 0
        );
        console.log(`📈 Dados com valores válidos: ${dadosComValores.length} (${((dadosComValores.length/dadosCompletos.length)*100).toFixed(1)}%)`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro na inicialização do dashboard:', error);
        showMessage(`❌ Erro: ${error.message}`);
        
        console.log('');
        console.log('🔧 === INSTRUÇÕES DE DEBUG ===');
        console.log('1. Verifique se os arquivos estão na pasta "data/"');
        console.log('2. Execute diagnosticDataDetailed() para mais detalhes');
        console.log('3. Execute verificarIntegridadeDados() para verificar qualidade');
        console.log('4. Execute exportarDadosParaVerificacao() para exportar CSV');
        
        throw error;
    }
}

// ================================
// FUNÇÕES AUXILIARES PARA INICIALIZAÇÃO
// ================================
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
                        reject(new Error('Timeout: Mapa não criado em 5 segundos'));
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
                        resolve();
                    }
                }, 500);
            } else {
                reject(new Error('Função addPolygonsToMap não encontrada'));
            }
        } catch (error) {
            console.warn('⚠️ Erro ao adicionar polígonos, mas continuando:', error);
            resolve();
        }
    });
}

// ================================
// FUNÇÕES UTILITÁRIAS
// ================================
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
window.formatNumber = formatNumber;
window.diagnosticDataDetailed = diagnosticDataDetailed;
window.getMediaDoBairro = getMediaDoBairro;
window.updateInfoCards = updateInfoCards;
window.updateRelatorio = updateRelatorio;
window.verificarIntegridadeDados = verificarIntegridadeDados;
window.exportarDadosParaVerificacao = exportarDadosParaVerificacao;
window.estatisticasMerge = estatisticasMerge;
window.executarMergeCompleto = executarMergeCompleto;
window.converterSIRGAS2000ParaWGS84 = converterSIRGAS2000ParaWGS84;
window.isValidSaoLuisCoordinate = isValidSaoLuisCoordinate;

console.log('✅ DASHBOARD COMPLETO CORRIGIDO PARA HEADERS CARREGADO!');
console.log('🔍 Execute diagnosticDataDetailed() para diagnóstico completo');
console.log('🧪 Execute verificarIntegridadeDados() para verificar integridade');
console.log('📤 Execute exportarDadosParaVerificacao() para exportar CSV'); {};
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
    
    estatisticasPorBairro =
