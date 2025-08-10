// ================================
// DASHBOARD PRINCIPAL - SOLARMAP
// VERSÃO CORRIGIDA PARA HEADERS COM ESPAÇOS
// ================================
console.log('🚀 Dashboard SolarMap - VERSÃO CORRIGIDA PARA HEADERS');

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
    console.log('🔍 Normalizando row:', Object.keys(row).slice(0, 5));
    
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
    
    // DEBUG: Log do primeiro item normalizado
    if (normalizado.objectid === 13429) {
        console.log('🔍 DEBUG: Primeiro item normalizado:', normalizado);
    }
    
    return normalizado;
}
