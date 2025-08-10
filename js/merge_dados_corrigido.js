// ================================
// SISTEMA DE MERGE CORRIGIDO - GEOJSON + EXCEL
// VERSÃO DEFINITIVA PARA SOLARMAP
// ================================

console.log('🔗 Iniciando sistema de merge corrigido...');

// ================================
// VARIÁVEIS GLOBAIS
// ================================
let dadosGeoJSONRaw = null;
let dadosExcelRaw = null;
let dadosProcessados = [];
let mapeamentoObjectId = new Map();
let estatisticasMerge = {
    totalGeoJSON: 0,
    totalExcel: 0,
    sucessos: 0,
    semMatch: 0,
    erros: 0
};

// ================================
// 1. CARREGAMENTO DO GEOJSON CORRIGIDO
// ================================
async function carregarGeoJSONCorrigido() {
    console.log('📍 === CARREGANDO GEOJSON CORRIGIDO ===');
    
    try {
        const response = await fetch('data/Dados_energia_solar.geojson');
        if (!response.ok) {
            throw new Error(`GeoJSON não encontrado: ${response.status}`);
        }
        
        const geoData = await response.json();
        dadosGeoJSONRaw = geoData;
        
        console.log(`✅ GeoJSON carregado: ${geoData.features.length} features`);
        
        // Analisar estrutura dos OBJECTIDs no GeoJSON
        const objectIdsGeoJSON = [];
        geoData.features.forEach((feature, index) => {
            const props = feature.properties;
            const objectId = extrairObjectIdGeoJSON(props, index);
            
            if (objectId !== null) {
                objectIdsGeoJSON.push(objectId);
            }
        });
        
        console.log(`📊 OBJECTIDs encontrados no GeoJSON: ${objectIdsGeoJSON.length}`);
        console.log(`📊 Range de IDs: ${Math.min(...objectIdsGeoJSON)} - ${Math.max(...objectIdsGeoJSON)}`);
        console.log(`📊 Primeiros 5 IDs:`, objectIdsGeoJSON.slice(0, 5));
        
        estatisticasMerge.totalGeoJSON = geoData.features.length;
        return geoData;
        
    } catch (error) {
        console.error('❌ Erro ao carregar GeoJSON:', error);
        throw error;
    }
}

// ================================
// 2. CARREGAMENTO DO EXCEL CORRIGIDO
// ================================
async function carregarExcelCorrigido() {
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
        throw new Error('Arquivo Excel não encontrado');
    }
    
    try {
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
            type: 'array',
            cellDates: true,
            cellStyles: true
        });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converter para JSON preservando headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: '',
            dateNF: 'YYYY-MM-DD'
        });
        
        if (jsonData.length === 0) {
            throw new Error('Planilha Excel vazia');
        }
        
        dadosExcelRaw = jsonData;
        
        console.log(`✅ Excel processado: ${jsonData.length} registros`);
        console.log('📋 Headers Excel:', Object.keys(jsonData[0]).slice(0, 10));
        
        // Analisar OBJECTIDs no Excel
        const objectIdsExcel = [];
        jsonData.forEach((row, index) => {
            const objectId = extrairObjectIdExcel(row, index);
            
            if (objectId !== null) {
                objectIdsExcel.push(objectId);
            }
        });
        
        console.log(`📊 OBJECTIDs encontrados no Excel: ${objectIdsExcel.length}`);
        console.log(`📊 Range de IDs: ${Math.min(...objectIdsExcel)} - ${Math.max(...objectIdsExcel)}`);
        console.log(`📊 Primeiros 5 IDs:`, objectIdsExcel.slice(0, 5));
        
        // Verificar duplicatas
        const uniqueIds = [...new Set(objectIdsExcel)];
        if (uniqueIds.length !== objectIdsExcel.length) {
            console.warn(`⚠️ Duplicatas no Excel: ${objectIdsExcel.length - uniqueIds.length}`);
        }
        
        estatisticasMerge.totalExcel = jsonData.length;
        return jsonData;
        
    } catch (error) {
        console.error('❌ Erro ao processar Excel:', error);
        throw error;
    }
}

// ================================
// 3. EXTRAÇÃO DE OBJECTID MELHORADA
// ================================
function extrairObjectIdGeoJSON(properties, fallbackIndex) {
    // Lista de possíveis campos para OBJECTID
    const camposPossiveis = [
        'OBJECTID', 'ObjectID', 'objectid', 'object_id', 'OBJECT_ID',
        'FID', 'FID_1', 'fid', 'ID', 'id', 'Id'
    ];
    
    for (const campo of camposPossiveis) {
        if (properties.hasOwnProperty(campo)) {
            const valor = properties[campo];
            
            if (valor !== null && valor !== undefined && valor !== '') {
                const numeroConvertido = parseInt(String(valor));
                
                if (!isNaN(numeroConvertido) && numeroConvertido > 0) {
                    return numeroConvertido;
                }
            }
        }
    }
    
    // Fallback: usar índice + 1
    return fallbackIndex + 1;
}

function extrairObjectIdExcel(row, fallbackIndex) {
    // Lista de possíveis campos para OBJECTID
    const camposPossiveis = [
        'OBJECTID', 'ObjectID', 'objectid', 'object_id', 'OBJECT_ID',
        'FID', 'FID_1', 'fid', 'ID', 'id', 'Id'
    ];
    
    for (const campo of camposPossiveis) {
        if (row.hasOwnProperty(campo)) {
            const valor = row[campo];
            
            if (valor !== null && valor !== undefined && valor !== '') {
                const numeroConvertido = parseInt(String(valor));
                
                if (!isNaN(numeroConvertido) && numeroConvertido > 0) {
                    return numeroConvertido;
                }
            }
        }
    }
    
    // Fallback: usar índice + 1
    return fallbackIndex + 1;
}

// ================================
// 4. NORMALIZAÇÃO DOS DADOS EXCEL
// ================================
function normalizarDadosExcel(row) {
    // Mapeamento de campos conforme especificação
    const mapeamentoCampos = {
        'OBJECTID': 'objectid',
        'Bairros': 'bairro',
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
    
    // Campos mensais de produção
    const mesesProducao = [
        'Produção de energia no mês de janeiro kW do telhado do edifício',
        'Produção de energia no mês de fevereiro kW do telhado do edifício',
        'Produção de energia no mês de março kW do telhado do edifício',
        'Produção de energia no mês de abril kW do telhado do edifício',
        'Produção de energia no mês de maio kW do telhado do edifício',
        'Produção de energia no mês de junho kW do telhado do edifício',
        'Produção de energia no mês de julho kW do telhado do edifício',
        'Produção de energia no mês de agosto kW do telhado do edifício',
        'Produção de energia no mês de setembro kW do telhado do edifício',
        'Produção de energia no mês de outubro kW do telhado do edifício',
        'Produção de energia no mês de novembro kW do telhado do edifício',
        'Produção de energia no mês de dezembro kW do telhado do edifício'
    ];
    
    // Campos mensais de radiação
    const mesesRadiacao = [
        'Quantidade de Radiação Solar no mês de janeiro (kW.m²)',
        'Quantidade de Radiação Solar no mês de fevereiro (kW.m²)',
        'Quantidade de Radiação Solar no mês de março (kW.m²)',
        'Quantidade de Radiação Solar no mês de abril (kW.m²)',
        'Quantidade de Radiação Solar no mês de maio (kW.m²)',
        'Quantidade de Radiação Solar no mês de junho (kW.m²)',
        'Quantidade de Radiação Solar no mês de julho (kW.m²)',
        'Quantidade de Radiação Solar no mês de agosto (kW.m²)',
        'Quantidade de Radiação Solar no mês de setembro (kW.m²)',
        'Quantidade de Radiação Solar no mês de outubro (kW.m²)',
        'Quantidade de Radiação Solar no mês de novembro (kW.m²)',
        'Quantidade de Radiação Solar no mês de dezembro (kW.m²)'
    ];
    
    const normalizado = {};
    
    // Processar campos básicos
    Object.entries(row).forEach(([chave, valor]) => {
        const campoNormalizado = mapeamentoCampos[chave] || chave.toLowerCase().replace(/\s+/g, '_');
        
        if (valor !== null && valor !== undefined && valor !== '') {
            // Campo de bairro - manter como string
            if (chave === 'Bairros' || campoNormalizado === 'bairro') {
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
            if (chave === 'Bairros' || campoNormalizado === 'bairro') {
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
            const valorLimpo = String(valor)
                .replace(/\./g, '')
                .replace(',', '.')
                .replace(/[^\d.-]/g, '');
            const valorNumerico = parseFloat(valorLimpo);
            return isNaN(valorNumerico) ? 0 : valorNumerico;
        }
        return 0;
    });
    
    // Processar dados mensais de radiação
    const dadosMensaisRadiacao = mesesRadiacao.map(campo => {
        const valor = row[campo];
        if (valor !== null && valor !== undefined && valor !== '') {
            const valorLimpo = String(valor)
                .replace(/\./g, '')
                .replace(',', '.')
                .replace(/[^\d.-]/g, '');
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

// ================================
// 5. PROCESSAMENTO DE COORDENADAS SIRGAS 2000
// ================================
function processarCoordenadas(feature) {
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
        
        // Converter pontos SIRGAS 2000 para WGS84
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
        
        // Calcular centroide
        const centroide = calcularCentroide(pontosConvertidos);
        if (!centroide || !coordenadaValidaSaoLuis(centroide[0], centroide[1])) {
            return null;
        }
        
        return {
            coordenadas: pontosConvertidos,
            centroide: centroide
        };
        
    } catch (error) {
        return null;
    }
}

function converterSIRGAS2000ParaWGS84(utmX, utmY) {
    try {
        if (!utmX || !utmY || isNaN(utmX) || isNaN(utmY)) {
            return null;
        }
        
        // Parâmetros SIRGAS 2000 UTM Zona 23S
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
        
        // Verificar se está dentro dos limites de São Luís
        if (latDeg < -2.800 || latDeg > -2.200 || lonDeg < -44.600 || lonDeg > -43.900) {
            return null;
        }
        
        return [latDeg, lonDeg];
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

function coordenadaValidaSaoLuis(lat, lng) {
    return lat >= -2.800 && lat <= -2.200 && lng >= -44.600 && lng <= -43.900;
}

// ================================
// 6. MERGE PRINCIPAL DOS DADOS
// ================================
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
        await carregarGeoJSONCorrigido();
        await carregarExcelCorrigido();
        
        // Criar índice Excel por OBJECTID
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
        dadosProcessados = [];
        
        for (let i = 0; i < dadosGeoJSONRaw.features.length; i++) {
            const feature = dadosGeoJSONRaw.features[i];
            
            try {
                // Extrair OBJECTID
                const objectId = extrairObjectIdGeoJSON(feature.properties, i);
                
                // Processar geometria
                const geometriaProcessada = processarCoordenadas(feature);
                if (!geometriaProcessada) {
                    estatisticasMerge.erros++;
                    continue;
                }
                
                // Buscar dados no Excel
                const dadosExcel = indiceExcel.get(objectId);
                const temMatch = !!dadosExcel;
                
                if (temMatch) {
                    estatisticasMerge.sucessos++;
                } else {
                    estatisticasMerge.semMatch++;
                }
                
                // Criar item combinado
                const itemCombinado = {
                    id: objectId,
                    coordinates: geometriaProcessada.coordenadas,
                    centroid: geometriaProcessada.centroide,
                    geometryType: feature.geometry.type,
                    properties: criarPropriedadesCombinadas(feature.properties, dadosExcel, objectId),
                    originalGeoProperties: feature.properties,
                    excelData: dadosExcel,
                    isLinked: temMatch
                };
                
                dadosProcessados.push(itemCombinado);
                
            } catch (error) {
                console.error(`❌ Erro ao processar feature ${i}:`, error);
                estatisticasMerge.erros++;
            }
        }
        
        // Finalizar
        console.log('✅ 4/4 - Finalizando merge...');
        
        // Atualizar variáveis globais
        window.dadosCompletos = dadosProcessados;
        window.dadosGeoJSON = dadosGeoJSONRaw.features;
        window.dadosExcel = dadosExcelRaw;
        
        // Relatório final
        console.log('📊 === RELATÓRIO FINAL DO MERGE ===');
        console.log(`📍 Total GeoJSON: ${estatisticasMerge.totalGeoJSON}`);
        console.log(`📊 Total Excel: ${estatisticasMerge.totalExcel}`);
        console.log(`✅ Merge sucessos: ${estatisticasMerge.sucessos}`);
        console.log(`⚠️ Sem match Excel: ${estatisticasMerge.semMatch}`);
        console.log(`❌ Erros: ${estatisticasMerge.erros}`);
        console.log(`📈 Total processado: ${dadosProcessados.length}`);
        console.log(`📈 Taxa de sucesso: ${((estatisticasMerge.sucessos / dadosProcessados.length) * 100).toFixed(1)}%`);
        
        // Verificar qualidade dos dados
        verificarQualidadeDados();
        
        console.log('✅ Merge completo executado com sucesso!');
        return dadosProcessados;
        
    } catch (error) {
        console.error('❌ Erro no merge completo:', error);
        throw error;
    }
}

// ================================
// 7. CRIAR PROPRIEDADES COMBINADAS
// ================================
function criarPropriedadesCombinadas(geoProperties, excelData, objectId) {
    // Usar dados do Excel quando disponível, senão usar valores padrão
    return {
        id: objectId,
        objectid: objectId,
        
        // Dados principais
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
        
        // Dados mensais
        dados_mensais_producao: excelData?.dados_mensais_producao || new Array(12).fill(0),
        dados_mensais_radiacao: excelData?.dados_mensais_radiacao || new Array(12).fill(0)
    };
}

// ================================
// 8. VERIFICAÇÃO DE QUALIDADE
// ================================
function verificarQualidadeDados() {
    console.log('🔍 === VERIFICAÇÃO DE QUALIDADE ===');
    
    if (dadosProcessados.length === 0) {
        console.error('❌ Nenhum dado processado!');
        return;
    }
    
    let comDadosExcel = 0;
    let comValoresReais = 0;
    let bairrosUnicos = new Set();
    let coordenadasValidas = 0;
    
    dadosProcessados.forEach(item => {
        if (item.isLinked) {
            comDadosExcel++;
        }
        
        if (item.properties.area_edificacao > 0 || 
            item.properties.producao_telhado > 0 || 
            item.properties.capacidade_por_m2 > 0) {
            comValoresReais++;
        }
        
        if (item.properties.bairro && item.properties.bairro !== 'Não informado') {
            bairrosUnicos.add(item.properties.bairro);
        }
        
        if (item.coordinates && item.coordinates.length > 0) {
            coordenadasValidas++;
        }
    });
    
    console.log(`✅ Itens com dados Excel: ${comDadosExcel} (${((comDadosExcel/dadosProcessados.length)*100).toFixed(1)}%)`);
    console.log(`📊 Itens com valores reais: ${comValoresReais} (${((comValoresReais/dadosProcessados.length)*100).toFixed(1)}%)`);
    console.log(`🏘️ Bairros únicos: ${bairrosUnicos.size}`);
    console.log(`📍 Coordenadas válidas: ${coordenadasValidas} (${((coordenadasValidas/dadosProcessados.length)*100).toFixed(1)}%)`);
    
    // Listar bairros
    const listaBairros = Array.from(bairrosUnicos).sort();
    console.log('🏘️ Lista de bairros:', listaBairros.slice(0, 10));
    
    // Exemplo de dados
    if (dadosProcessados.length > 0) {
        const exemplo = dadosProcessados.find(item => item.isLinked) || dadosProcessados[0];
        console.log('📋 Exemplo de item processado:');
        console.log(`   ID: ${exemplo.id}`);
        console.log(`   Bairro: ${exemplo.properties.bairro}`);
        console.log(`   Área: ${exemplo.properties.area_edificacao}`);
        console.log(`   Produção: ${exemplo.properties.producao_telhado}`);
        console.log(`   Vinculado: ${exemplo.isLinked ? 'SIM' : 'NÃO'}`);
    }
}

// ================================
// 9. DIAGNÓSTICO DETALHADO
// ================================
function diagnosticoDetalhado() {
    console.log('🔍 === DIAGNÓSTICO DETALHADO ===');
    
    // Analisar GeoJSON
    if (dadosGeoJSONRaw) {
        console.log('📍 GEOJSON:');
        console.log(`   Features: ${dadosGeoJSONRaw.features.length}`);
        
        const feature1 = dadosGeoJSONRaw.features[0];
        if (feature1) {
            console.log('   Primeira feature:');
            console.log('     Properties:', Object.keys(feature1.properties));
            console.log('     Geometry type:', feature1.geometry.type);
            console.log('     OBJECTID encontrado:', extrairObjectIdGeoJSON(feature1.properties, 0));
        }
    }
    
    // Analisar Excel
    if (dadosExcelRaw) {
        console.log('📊 EXCEL:');
        console.log(`   Registros: ${dadosExcelRaw.length}`);
        
        const row1 = dadosExcelRaw[0];
        if (row1) {
            console.log('   Primeira linha:');
            console.log('     Campos:', Object.keys(row1).slice(0, 10));
            console.log('     OBJECTID encontrado:', extrairObjectIdExcel(row1, 0));
            console.log('     Bairro:', row1['Bairros'] || 'Não encontrado');
        }
    }
    
    // Analisar dados processados
    if (dadosProcessados.length > 0) {
        console.log('🔗 DADOS PROCESSADOS:');
        console.log(`   Total: ${dadosProcessados.length}`);
        
        const item1 = dadosProcessados[0];
        console.log('   Primeiro item:');
        console.log(`     ID: ${item1.id}`);
        console.log(`     Vinculado: ${item1.isLinked}`);
        console.log(`     Bairro: ${item1.properties.bairro}`);
        console.log(`     Coordenadas: ${item1.coordinates ? item1.coordinates.length : 0} pontos`);
        console.log(`     Centroide: [${item1.centroid[0].toFixed(6)}, ${item1.centroid[1].toFixed(6)}]`);
    }
}

// ================================
// 10. TESTES DE VALIDAÇÃO
// ================================
function testarMerge() {
    console.log('🧪 === TESTE DO MERGE ===');
    
    // Teste 1: Verificar se dados foram carregados
    console.log('🧪 Teste 1: Carregamento de dados');
    console.log(`   GeoJSON: ${dadosGeoJSONRaw ? '✅' : '❌'}`);
    console.log(`   Excel: ${dadosExcelRaw ? '✅' : '❌'}`);
    console.log(`   Processados: ${dadosProcessados.length > 0 ? '✅' : '❌'}`);
    
    // Teste 2: Verificar OBJECTIDs
    if (dadosGeoJSONRaw && dadosExcelRaw) {
        console.log('🧪 Teste 2: OBJECTIDs');
        
        const idsGeo = dadosGeoJSONRaw.features.map((f, i) => extrairObjectIdGeoJSON(f.properties, i));
        const idsExcel = dadosExcelRaw.map((r, i) => extrairObjectIdExcel(r, i));
        
        const idsGeoUnicos = new Set(idsGeo);
        const idsExcelUnicos = new Set(idsExcel);
        
        console.log(`   IDs únicos GeoJSON: ${idsGeoUnicos.size}`);
        console.log(`   IDs únicos Excel: ${idsExcelUnicos.size}`);
        
        // Verificar interseção
        const intersecao = new Set([...idsGeoUnicos].filter(id => idsExcelUnicos.has(id)));
        console.log(`   IDs em comum: ${intersecao.size}`);
        console.log(`   Taxa de match: ${((intersecao.size / idsGeoUnicos.size) * 100).toFixed(1)}%`);
    }
    
    // Teste 3: Verificar qualidade dos dados processados
    if (dadosProcessados.length > 0) {
        console.log('🧪 Teste 3: Qualidade dos dados');
        
        const comCoordenadas = dadosProcessados.filter(item => item.coordinates && item.coordinates.length > 0);
        const comDadosExcel = dadosProcessados.filter(item => item.isLinked);
        const comBairros = dadosProcessados.filter(item => item.properties.bairro && item.properties.bairro !== 'Não informado');
        
        console.log(`   Com coordenadas: ${comCoordenadas.length}/${dadosProcessados.length}`);
        console.log(`   Com dados Excel: ${comDadosExcel.length}/${dadosProcessados.length}`);
        console.log(`   Com bairros: ${comBairros.length}/${dadosProcessados.length}`);
    }
    
    console.log('✅ Teste do merge concluído');
}

// ================================
// 11. FUNÇÃO PARA REEXECUTAR MERGE
// ================================
async function reexecutarMerge() {
    console.log('🔄 Reexecutando merge...');
    
    try {
        // Limpar dados anteriores
        dadosGeoJSONRaw = null;
        dadosExcelRaw = null;
        dadosProcessados = [];
        mapeamentoObjectId.clear();
        
        // Executar merge novamente
        await executarMergeCompleto();
        
        console.log('✅ Merge reexecutado com sucesso!');
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao reexecutar merge:', error);
        return false;
    }
}

// ================================
// 12. EXPORTAR DADOS PARA VERIFICAÇÃO
// ================================
function exportarDadosParaVerificacao() {
    console.log('📤 === EXPORTANDO DADOS PARA VERIFICAÇÃO ===');
    
    if (dadosProcessados.length === 0) {
        console.error('❌ Nenhum dado processado para exportar');
        return;
    }
    
    // Criar resumo dos dados
    const resumo = dadosProcessados.map(item => ({
        id: item.id,
        bairro: item.properties.bairro,
        area: item.properties.area_edificacao,
        producao: item.properties.producao_telhado,
        radiacao: item.properties.radiacao_max,
        vinculado: item.isLinked,
        latitude: item.centroid[0].toFixed(6),
        longitude: item.centroid[1].toFixed(6)
    }));
    
    // Criar CSV do resumo
    const csvHeader = 'ID,Bairro,Area,Producao,Radiacao,Vinculado,Latitude,Longitude\n';
    const csvContent = resumo.map(item => 
        `${item.id},"${item.bairro}",${item.area},${item.producao},${item.radiacao},${item.vinculado},${item.latitude},${item.longitude}`
    ).join('\n');
    
    const csvCompleto = csvHeader + csvContent;
    
    // Criar blob e download
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
    
    // Também mostrar uma amostra no console
    console.log('📋 Amostra dos dados (primeiros 5):');
    resumo.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. ID ${item.id}: ${item.bairro} - Área: ${item.area}m² - Vinculado: ${item.vinculado}`);
    });
}

// ================================
// 13. FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
// ================================
async function inicializarSistemaMerge() {
    console.log('🚀 === INICIALIZANDO SISTEMA DE MERGE ===');
    
    try {
        // Verificar se XLSX está disponível
        if (typeof XLSX === 'undefined') {
            throw new Error('Biblioteca XLSX não carregada');
        }
        
        // Executar merge completo
        await executarMergeCompleto();
        
        // Executar testes
        testarMerge();
        
        // Diagnóstico
        diagnosticoDetalhado();
        
        console.log('✅ Sistema de merge inicializado com sucesso!');
        
        // Mostrar instruções
        console.log('');
        console.log('📋 === INSTRUÇÕES DE USO ===');
        console.log('🔍 diagnosticoDetalhado() - Diagnóstico completo');
        console.log('🧪 testarMerge() - Executar testes');
        console.log('🔄 reexecutarMerge() - Reexecutar merge');
        console.log('📤 exportarDadosParaVerificacao() - Exportar CSV');
        console.log('📊 window.dadosCompletos - Dados finais processados');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro na inicialização do sistema de merge:', error);
        throw error;
    }
}

// ================================
// 14. EXPORTAÇÕES GLOBAIS
// ================================
window.executarMergeCompleto = executarMergeCompleto;
window.diagnosticoDetalhado = diagnosticoDetalhado;
window.testarMerge = testarMerge;
window.reexecutarMerge = reexecutarMerge;
window.exportarDadosParaVerificacao = exportarDadosParaVerificacao;
window.inicializarSistemaMerge = inicializarSistemaMerge;
window.verificarQualidadeDados = verificarQualidadeDados;
window.estatisticasMerge = estatisticasMerge;

// Funções específicas também disponíveis globalmente
window.carregarGeoJSONCorrigido = carregarGeoJSONCorrigido;
window.carregarExcelCorrigido = carregarExcelCorrigido;
window.extrairObjectIdGeoJSON = extrairObjectIdGeoJSON;
window.extrairObjectIdExcel = extrairObjectIdExcel;
window.normalizarDadosExcel = normalizarDadosExcel;
window.processarCoordenadas = processarCoordenadas;
window.converterSIRGAS2000ParaWGS84 = converterSIRGAS2000ParaWGS84;

console.log('✅ SISTEMA DE MERGE CORRIGIDO CARREGADO!');
console.log('🚀 Execute inicializarSistemaMerge() para começar');
console.log('📋 Todas as funções estão disponíveis globalmente');
