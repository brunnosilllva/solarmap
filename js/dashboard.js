// ================================
// DASHBOARD PRINCIPAL - SOLARMAP
// VERSÃO FINAL LIMPA E COMPLETA
// COM CORREÇÃO DE NORMALIZAÇÃO NUMÉRICA
// ================================
console.log('🚀 Dashboard SolarMap - VERSÃO FINAL LIMPA (COM CORREÇÃO NUMÉRICA)');

// ================================
// VARIÁVEIS GLOBAIS
// ================================
let dadosCompletos = [];
let dadosExcel = [];
let dadosGeoJSON = [];
let imovelSelecionado = null;
let estatisticas = {};
let estatisticasPorBairro = {};
let dadosGeoJSONRaw = null;
let dadosExcelRaw = null;
let estatisticasMerge = {
    totalGeoJSON: 0,
    totalExcel: 0,
    sucessos: 0,
    semMatch: 0,
    erros: 0
};

let filtrosAtivos = {
    bairros: [],
    info: 'capacidade_por_m2',
    minValue: null,
    maxValue: null
};

// ================================
// FUNÇÕES UTILITÁRIAS
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
        position: fixed; top: 20px; right: 20px;
        background: ${message.includes('❌') ? '#e74c3c' : '#27ae60'};
        color: white; padding: 15px 20px; border-radius: 8px;
        font-family: Arial, sans-serif; font-size: 14px; z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 400px;
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
// CARREGAMENTO DE DADOS
// ================================
async function carregarGeoJSON() {
    console.log('📍 Carregando GeoJSON...');
    const response = await fetch('data/Dados_energia_solar.geojson');
    if (!response.ok) throw new Error(`GeoJSON não encontrado: ${response.status}`);
    
    const geoData = await response.json();
    dadosGeoJSONRaw = geoData;
    console.log(`✅ GeoJSON: ${geoData.features.length} features`);
    estatisticasMerge.totalGeoJSON = geoData.features.length;
    return geoData;
}

async function carregarExcel() {
    console.log('📊 Carregando Excel...');
    const response = await fetch('data/Dados_energia_solar.xlsx');
    if (!response.ok) throw new Error('Excel não encontrado');
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
    
    dadosExcelRaw = jsonData;
    window.dadosExcelRaw = dadosExcelRaw;
    
    console.log(`✅ Excel: ${jsonData.length} registros`);
    console.log('Headers Excel:', Object.keys(jsonData[0]).slice(0, 5));
    console.log('Primeiro bairro:', jsonData[0][' Bairros ']);
    
    estatisticasMerge.totalExcel = jsonData.length;
    return jsonData;
}

// ================================
// EXTRAÇÃO DE OBJECTID
// ================================
function extrairObjectIdGeoJSON(properties, fallbackIndex) {
    const campos = ['OBJECTID', 'ObjectID', 'objectid', 'FID', 'ID', 'id'];
    for (const campo of campos) {
        if (properties[campo]) {
            const num = parseInt(String(properties[campo]));
            if (!isNaN(num) && num > 0) return num;
        }
    }
    return fallbackIndex + 1;
}

function extrairObjectIdExcel(row, fallbackIndex) {
    const campos = ['OBJECTID', 'ObjectID', 'objectid', 'FID_1', 'FID', 'ID', 'id'];
    for (const campo of campos) {
        if (row[campo]) {
            const num = parseInt(String(row[campo]));
            if (!isNaN(num) && num > 0) return num;
        }
    }
    return fallbackIndex + 1;
}

// ================================
// FUNÇÃO CORRIGIDA PARA CONVERSÃO DE NÚMEROS
// ================================
function converterNumeroCorreto(valor) {
    if (valor === null || valor === undefined || valor === '') {
        return null;
    }
    
    // Converter para string primeiro
    let valorString = String(valor).trim();
    
    // Se for um número puro sem formatação, retornar direto
    if (!isNaN(Number(valorString)) && !valorString.includes(',') && !valorString.includes('.')) {
        return Number(valorString);
    }
    
    // CORREÇÃO MELHORADA: Detectar formato brasileiro vs americano
    const temVirgula = valorString.includes(',');
    const temPonto = valorString.includes('.');
    
    // Caso 1: Formato brasileiro com vírgula decimal
    if (temVirgula && temPonto) {
        // Verificar qual é o último: vírgula ou ponto
        const ultimaVirgula = valorString.lastIndexOf(',');
        const ultimoPonto = valorString.lastIndexOf('.');
        
        if (ultimaVirgula > ultimoPonto) {
            // Formato brasileiro: "1.234,56" 
            valorString = valorString.replace(/\./g, '').replace(',', '.');
        } else {
            // Formato americano: "1,234.56"
            valorString = valorString.replace(/,/g, '');
        }
    } else if (temVirgula && !temPonto) {
        // Só vírgula: formato brasileiro "21,72"
        valorString = valorString.replace(',', '.');
    }
    // Se só tem ponto ou nenhum dos dois, manter como está
    
    // Remover caracteres não numéricos (exceto ponto decimal e sinal)
    valorString = valorString.replace(/[^\d.-]/g, '');
    
    // Garantir que só há um ponto decimal
    const partes = valorString.split('.');
    if (partes.length > 2) {
        valorString = partes[0] + '.' + partes.slice(1).join('');
    }
    
    const valorConvertido = parseFloat(valorString);
    return isNaN(valorConvertido) ? null : valorConvertido;
}

// ================================
// FUNÇÃO PARA PROCESSAR DADOS MENSAIS
// ================================
function processarDadosMensais(row, tipo) {
    let campos = [];
    
    if (tipo === 'producao') {
        campos = [
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
    } else if (tipo === 'radiacao') {
        campos = [
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
    }
    
    return campos.map(campo => {
        const valor = row[campo];
        const valorConvertido = converterNumeroCorreto(valor);
        return valorConvertido !== null ? valorConvertido : 0;
    });
}

// ================================
// NORMALIZAÇÃO DE DADOS (CORRIGIDA)
// ================================
function normalizarDadosExcel(row) {
    const mapeamento = {
        'OBJECTID': 'objectid',
        'FID_1': 'fid',
        ' Bairros ': 'bairro',
        'Bairros': 'bairro',
        ' Área em metros quadrados da edificação ': 'area_edificacao',
        ' Produção de energia kW do telhado do edifício ': 'producao_telhado',
        ' Capacidade de Produção de energia em kW por m² ': 'capacidade_por_m2',
        ' Quantidade de Radiação Máxima Solar nos mêses (kW.m² ': 'radiacao_max',
        'Quantidade de Radiação Máxima Solar nos mêses (kW.m²': 'radiacao_max',
        ' Quantidade de Placas Fotovoltaicas capaz de gerar a energia gerada do imovel ': 'quantidade_placas',
        ' Capacidade de Produção de energia em Placas Fotovoltaicas em kW.h.dia ': 'capacidade_placas_dia',
        ' Capacidade de Produção de energia em Placas Fotovoltaicas em kW.h.mês ': 'capacidade_placas_mes',
        ' Potencial médio de geração FV em um dia (kW.dia.m²) ': 'potencial_medio_dia',
        ' Renda Total ': 'renda_total',
        ' Renda per capita ': 'renda_per_capita',
        ' Renda domiciliar per capita ': 'renda_domiciliar_per_capita'
    };
    
    const normalizado = {};
    
    Object.entries(row).forEach(([chave, valor]) => {
        const campoNormalizado = mapeamento[chave] || chave.toLowerCase().replace(/\s+/g, '_');
        
        if (valor !== null && valor !== undefined && valor !== '') {
            // Campo de bairro - manter como string
            if (chave.includes('Bairros') || campoNormalizado === 'bairro') {
                normalizado[campoNormalizado] = String(valor).trim();
            } else {
                // CORREÇÃO: Usar a função melhorada para números
                const valorNumerico = converterNumeroCorreto(valor);
                normalizado[campoNormalizado] = valorNumerico !== null ? valorNumerico : String(valor).trim();
            }
        } else {
            // Valores padrão
            if (chave.includes('Bairros') || campoNormalizado === 'bairro') {
                normalizado[campoNormalizado] = 'Não informado';
            } else {
                normalizado[campoNormalizado] = 0;
            }
        }
    });
    
    // Processar dados mensais corrigidos
    const dadosMensaisProducao = processarDadosMensais(row, 'producao');
    const dadosMensaisRadiacao = processarDadosMensais(row, 'radiacao');
    
    normalizado.dados_mensais_producao = dadosMensaisProducao;
    normalizado.dados_mensais_radiacao = dadosMensaisRadiacao;
    
    return normalizado;
}

// ================================
// CONVERSÃO DE COORDENADAS
// ================================
function converterSIRGAS2000ParaWGS84(utmX, utmY) {
    if (!utmX || !utmY || isNaN(utmX) || isNaN(utmY)) return null;
    
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
    
    if (latDeg < -2.800 || latDeg > -2.200 || lonDeg < -44.600 || lonDeg > -43.900) return null;
    
    return [latDeg, lonDeg];
}

function processGeometrySIRGAS2000(feature) {
    const geometry = feature.geometry;
    if (!geometry || !geometry.coordinates) return null;
    
    let pontos = [];
    if (geometry.type === 'Polygon' && geometry.coordinates[0]) {
        pontos = geometry.coordinates[0];
    } else if (geometry.type === 'MultiPolygon' && geometry.coordinates[0] && geometry.coordinates[0][0]) {
        pontos = geometry.coordinates[0][0];
    } else {
        return null;
    }
    
    if (!pontos || pontos.length === 0) return null;
    
    const pontosConvertidos = [];
    for (const ponto of pontos) {
        if (ponto && ponto.length >= 2) {
            const coordenada = converterSIRGAS2000ParaWGS84(ponto[0], ponto[1]);
            if (coordenada) {
                pontosConvertidos.push([coordenada[0], coordenada[1]]);
            }
        }
    }
    
    if (pontosConvertidos.length === 0) return null;
    
    const centroide = calcularCentroide(pontosConvertidos);
    if (!centroide || centroide[0] < -2.800 || centroide[0] > -2.200 || centroide[1] < -44.600 || centroide[1] > -43.900) {
        return null;
    }
    
    return {
        coordinates: pontosConvertidos,
        centroid: centroide
    };
}

function calcularCentroide(pontos) {
    if (!pontos || pontos.length === 0) return null;
    let somaLat = 0, somaLng = 0;
    pontos.forEach(ponto => {
        somaLat += ponto[0];
        somaLng += ponto[1];
    });
    return [somaLat / pontos.length, somaLng / pontos.length];
}

// ================================
// MERGE PRINCIPAL
// ================================
async function executarMergeCompleto() {
    console.log('🔗 === EXECUTANDO MERGE ===');
    
    // Resetar estatísticas
    estatisticasMerge = { totalGeoJSON: 0, totalExcel: 0, sucessos: 0, semMatch: 0, erros: 0 };
    
    // Carregar dados
    console.log('📥 1/3 - Carregando dados...');
    await carregarGeoJSON();
    await carregarExcel();
    
    // Criar índice Excel
    console.log('📋 2/3 - Criando índice...');
    const indiceExcel = new Map();
    dadosExcelRaw.forEach((row, index) => {
        const objectId = extrairObjectIdExcel(row, index);
        if (objectId !== null) {
            const dadosNormalizados = normalizarDadosExcel(row);
            indiceExcel.set(objectId, dadosNormalizados);
        }
    });
    console.log(`📊 Índice criado: ${indiceExcel.size} registros`);
    
    // Processar merge
    console.log('🔗 3/3 - Executando merge...');
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
                properties: {
                    id: objectId,
                    objectid: objectId,
                    bairro: dadosExcel?.bairro || 'Não informado',
                    area_edificacao: dadosExcel?.area_edificacao || 0,
                    producao_telhado: dadosExcel?.producao_telhado || 0,
                    capacidade_por_m2: dadosExcel?.capacidade_por_m2 || 0,
                    radiacao_max: dadosExcel?.radiacao_max || 0,
                    quantidade_placas: dadosExcel?.quantidade_placas || 0,
                    capacidade_placas_dia: dadosExcel?.capacidade_placas_dia || 0,
                    capacidade_placas_mes: dadosExcel?.capacidade_placas_mes || 0,
                    potencial_medio_dia: dadosExcel?.potencial_medio_dia || 0,
                    renda_total: dadosExcel?.renda_total || 0,
                    renda_per_capita: dadosExcel?.renda_per_capita || 0,
                    renda_domiciliar_per_capita: dadosExcel?.renda_domiciliar_per_capita || 0,
                    dados_mensais_producao: dadosExcel?.dados_mensais_producao || new Array(12).fill(0),
                    dados_mensais_radiacao: dadosExcel?.dados_mensais_radiacao || new Array(12).fill(0)
                },
                originalGeoProperties: feature.properties,
                excelData: dadosExcel,
                isLinked: temMatch
            };
            
            dadosCompletos.push(itemCombinado);
            
        } catch (error) {
            console.error(`❌ Erro feature ${i}:`, error);
            estatisticasMerge.erros++;
        }
    }
    
    // Atualizar variáveis globais
    window.dadosCompletos = dadosCompletos;
    window.dadosGeoJSON = dadosGeoJSONRaw.features;
    window.dadosExcel = dadosExcelRaw;
    window.estatisticasMerge = estatisticasMerge;
    
    // Relatório final
    console.log('📊 === RELATÓRIO MERGE ===');
    console.log(`✅ Sucessos: ${estatisticasMerge.sucessos}`);
    console.log(`⚠️ Sem match: ${estatisticasMerge.semMatch}`);
    console.log(`❌ Erros: ${estatisticasMerge.erros}`);
    console.log(`📈 Total: ${dadosCompletos.length}`);
    console.log(`📈 Taxa: ${((estatisticasMerge.sucessos / dadosCompletos.length) * 100).toFixed(1)}%`);
    
    return dadosCompletos;
}

// ================================
// CÁLCULOS DE ESTATÍSTICAS
// ================================
function calcularEstatisticas() {
    if (!dadosCompletos || dadosCompletos.length === 0) {
        estatisticas = { total_imoveis: 0, producao_total: 0, media_producao: 0 };
        return;
    }
    
    const totalImoveis = dadosCompletos.length;
    const producaoTotal = dadosCompletos.reduce((sum, item) => {
        return sum + (item.properties?.capacidade_por_m2 || 0);
    }, 0);
    const mediaProducao = totalImoveis > 0 ? producaoTotal / totalImoveis : 0;
    
    estatisticas = { total_imoveis: totalImoveis, producao_total: producaoTotal, media_producao: mediaProducao };
    window.estatisticas = estatisticas;
    console.log('📊 Estatísticas calculadas:', estatisticas);
}

function calcularEstatisticasPorBairro() {
    if (!dadosCompletos || dadosCompletos.length === 0) {
        estatisticasPorBairro = {};
        return;
    }
    
    const dadosPorBairro = {};
    dadosCompletos.forEach(item => {
        const bairro = item.properties?.bairro || 'Não informado';
        if (!dadosPorBairro[bairro]) dadosPorBairro[bairro] = [];
        dadosPorBairro[bairro].push(item);
    });
    
    estatisticasPorBairro = {};
    Object.entries(dadosPorBairro).forEach(([bairro, imoveis]) => {
        estatisticasPorBairro[bairro] = {
            total_imoveis: imoveis.length,
            media_producao_mensal: new Array(12).fill(0),
            media_radiacao_mensal: new Array(12).fill(0)
        };
    });
    
    window.estatisticasPorBairro = estatisticasPorBairro;
    console.log('📊 Bairros calculados:', Object.keys(estatisticasPorBairro).length);
}

// ================================
// INTERFACE E FILTROS
// ================================
function updateSummaryCards() {
    const dados = filtrarDados();
    const totalEl = document.getElementById('total-imoveis-display');
    const producaoEl = document.getElementById('producao-total-display');
    const mediaEl = document.getElementById('media-imovel-display');
    
    if (totalEl) totalEl.textContent = dados.length.toLocaleString('pt-BR');
    if (producaoEl) {
        const total = dados.reduce((sum, item) => sum + (item.properties?.capacidade_por_m2 || 0), 0);
        producaoEl.textContent = formatNumber(total, 2);
    }
    if (mediaEl) {
        const total = dados.reduce((sum, item) => sum + (item.properties?.capacidade_por_m2 || 0), 0);
        const media = dados.length > 0 ? total / dados.length : 0;
        mediaEl.textContent = formatNumber(media, 2);
    }
}

function filtrarDados() {
    return dadosCompletos.filter(item => {
        if (!item || !item.properties) return false;
        const props = item.properties;
        if (filtrosAtivos.bairros.length > 0 && !filtrosAtivos.bairros.includes(props.bairro)) return false;
        const valor = props[filtrosAtivos.info] || 0;
        if (filtrosAtivos.minValue !== null && valor < filtrosAtivos.minValue) return false;
        if (filtrosAtivos.maxValue !== null && valor > filtrosAtivos.maxValue) return false;
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
        console.log(`✅ Imóvel ${imovelId} selecionado: ${imovel.properties.bairro}`);
        if (window.centerOnImovel) window.centerOnImovel(imovelId);
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
}

function updateRelatorio(imovel = null) {
    const tituloEl = document.getElementById('relatorio-titulo');
    const conteudoEl = document.getElementById('relatorio-conteudo');
    if (!tituloEl || !conteudoEl) return;
    
    if (imovel) {
        const props = imovel.properties;
        tituloEl.textContent = `📊 Relatório - Imóvel ${imovel.id}`;
        
        // NOVO TEXTO CORRIDO DETALHADO
        const textoRelatorio = `O imóvel selecionado no Bairro ${props.bairro}, localizado nas coordenadas (${imovel.centroid[0].toFixed(6)}, ${imovel.centroid[1].toFixed(6)}), possui ${formatNumber(props.area_edificacao, 2)} m², com Quantidade de Radiação Máxima Solar nos 12 meses do ano de ${formatNumber(props.radiacao_max, 2)} kW/m², apresentando uma Capacidade de Produção de energia de ${formatNumber(props.capacidade_por_m2, 2)} kW por m², com produção diária de ${formatNumber(props.capacidade_placas_dia, 2)} kWh e produção média mensal de ${formatNumber(props.capacidade_placas_mes, 2)} kWh. Para essa produção estima-se a necessidade de ${formatNumber(props.quantidade_placas, 0)} placas fotovoltaicas. O imóvel apresenta um potencial médio de geração de ${formatNumber(props.potencial_medio_dia, 2)} kW.dia/m² e está localizado em uma região com renda total de R$ ${formatNumber(props.renda_total, 2)}, renda per capita de R$ ${formatNumber(props.renda_per_capita, 2)} e renda domiciliar per capita de R$ ${formatNumber(props.renda_domiciliar_per_capita, 2)}.`;
        
        conteudoEl.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 20px;
                border-radius: 10px;
                border-left: 4px solid #28a745;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #dee2e6;
                ">
                    <div style="
                        background: #28a745;
                        color: white;
                        padding: 8px 12px;
                        border-radius: 6px;
                        font-weight: bold;
                        margin-right: 10px;
                        font-size: 14px;
                    ">
                        📊 ANÁLISE TÉCNICA
                    </div>
                    <div style="
                        color: #6c757d;
                        font-size: 12px;
                        font-style: italic;
                    ">
                        Relatório detalhado de potencial solar e socioeconômico
                    </div>
                </div>
                
                <p style="
                    text-align: justify;
                    line-height: 1.8;
                    font-size: 14px;
                    color: #343a40;
                    margin: 0;
                    text-indent: 20px;
                ">
                    ${textoRelatorio}
                </p>
                
                <div style="
                    margin-top: 15px;
                    padding-top: 10px;
                    border-top: 1px solid #dee2e6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 11px;
                    color: #6c757d;
                ">
                    <span>
                        📍 <strong>Coordenadas:</strong> ${imovel.centroid[0].toFixed(6)}, ${imovel.centroid[1].toFixed(6)}
                    </span>
                    <span>
                        🏠 <strong>ID:</strong> ${imovel.id}
                    </span>
                    <span>
                        📅 <strong>Gerado em:</strong> ${new Date().toLocaleDateString('pt-BR')}
                    </span>
                </div>
            </div>
        `;
    } else {
        tituloEl.textContent = '📊 Relatório do Imóvel';
        conteudoEl.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 30px;
                border-radius: 10px;
                border: 2px dashed #dee2e6;
                text-align: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            ">
                <div style="
                    font-size: 48px;
                    margin-bottom: 15px;
                    color: #6c757d;
                ">
                    📊
                </div>
                <h3 style="
                    color: #495057;
                    margin-bottom: 10px;
                    font-size: 18px;
                ">
                    Relatório Técnico Solar
                </h3>
                <p style="
                    color: #6c757d;
                    font-size: 14px;
                    margin-bottom: 20px;
                    line-height: 1.6;
                ">
                    Selecione um imóvel no mapa para gerar um relatório detalhado<br>
                    contendo análise de potencial solar e dados socioeconômicos.
                </p>
                <div style="
                    background: #e7f3ff;
                    padding: 10px;
                    border-radius: 6px;
                    border-left: 3px solid #0066cc;
                    font-size: 12px;
                    color: #0066cc;
                    font-style: italic;
                ">
                    💡 Dica: Clique em qualquer polígono azul no mapa para começar
                </div>
            </div>
        `;
    }
}

// ================================
// FUNÇÃO PARA TESTAR A CONVERSÃO
// ================================
function testarConversaoNumeros() {
    console.log('🧪 === TESTE DE CONVERSÃO DE NÚMEROS (CORRIGIDO) ===');
    
    const testes = [
        { input: '21.72', esperado: 21.72, desc: 'Formato americano' },
        { input: '21,72', esperado: 21.72, desc: 'Formato brasileiro' },
        { input: '65.00', esperado: 65.00, desc: 'Formato americano com zero' },
        { input: '65,00', esperado: 65.00, desc: 'Formato brasileiro com zero' },
        { input: '1.234,56', esperado: 1234.56, desc: 'Brasileiro com milhares' },
        { input: '1,234.56', esperado: 1234.56, desc: 'Americano com milhares' },
        { input: '49.00', esperado: 49.00, desc: 'Número simples' },
        { input: '0.15', esperado: 0.15, desc: 'Decimal americano' },
        { input: '0,15', esperado: 0.15, desc: 'Decimal brasileiro' },
        { input: '1000', esperado: 1000, desc: 'Inteiro puro' },
        { input: 21.72, esperado: 21.72, desc: 'Já é número' }
    ];
    
    let corretos = 0;
    let total = testes.length;
    
    testes.forEach(teste => {
        const resultado = converterNumeroCorreto(teste.input);
        const correto = Math.abs(resultado - teste.esperado) < 0.001;
        
        console.log(
            `${correto ? '✅' : '❌'} "${teste.input}" → ${resultado} ` +
            `(esperado: ${teste.esperado}) - ${teste.desc}`
        );
        
        if (correto) corretos++;
    });
    
    console.log(`\n📊 Resultado: ${corretos}/${total} testes passaram (${((corretos/total)*100).toFixed(1)}%)`);
    
    if (corretos === total) {
        console.log('🎉 Todos os testes passaram! Conversão funcionando perfeitamente.');
    } else {
        console.log('⚠️ Alguns testes falharam. Verifique a função de conversão.');
    }
}

// ================================
// FUNÇÃO PARA REPROCESSAR DADOS
// ================================
function reprocessarDados() {
    console.log('🔄 === REPROCESSANDO DADOS COM CORREÇÃO ===');
    
    if (!window.dadosExcelRaw || window.dadosExcelRaw.length === 0) {
        console.error('❌ Dados Excel não disponíveis');
        return;
    }
    
    console.log('📊 Reprocessando com correção numérica...');
    
    // Executar merge novamente
    executarMergeCompleto().then(() => {
        calcularEstatisticas();
        calcularEstatisticasPorBairro();
        updateSummaryCards();
        
        console.log('✅ Dados reprocessados com sucesso!');
        
        // Mostrar exemplo de dados corrigidos
        const exemploComDados = dadosCompletos.find(item => 
            item.isLinked && item.properties?.area_edificacao > 0
        );
        
        if (exemploComDados) {
            console.log('📋 Exemplo de dados corrigidos:');
            console.log(`   ID: ${exemploComDados.id}`);
            console.log(`   Bairro: ${exemploComDados.properties.bairro}`);
            console.log(`   Área: ${exemploComDados.properties.area_edificacao} m²`);
            console.log(`   Capacidade: ${exemploComDados.properties.capacidade_por_m2} kW/m²`);
            console.log(`   Produção: ${exemploComDados.properties.producao_telhado} kW`);
        }
        
        // Atualizar mapa se necessário
        if (window.addPolygonsToMap) {
            window.addPolygonsToMap();
        }
        
        showMessage('✅ Dados reprocessados com correção numérica!');
    }).catch(error => {
        console.error('❌ Erro no reprocessamento:', error);
        showMessage('❌ Erro no reprocessamento dos dados');
    });
}

// ================================
// DIAGNÓSTICO
// ================================
function diagnosticDataDetailed() {
    console.log('🔍 === DIAGNÓSTICO DETALHADO ===');
    
    if (dadosCompletos && dadosCompletos.length > 0) {
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
        
        const exemploComDados = dadosCompletos.find(item => item.isLinked && item.properties?.area_edificacao > 0);
        if (exemploComDados) {
            console.log('📋 Exemplo completo:');
            console.log(`   ID: ${exemploComDados.id}`);
            console.log(`   Bairro: ${exemploComDados.properties.bairro}`);
            console.log(`   Área: ${exemploComDados.properties.area_edificacao} m²`);
            console.log(`   Produção: ${exemploComDados.properties.producao_telhado} kW`);
        }
    } else {
        console.error('❌ Nenhum dado carregado');
    }
    
    console.log('📊 Merge stats:', estatisticasMerge);
    console.log('📊 Excel disponível:', !!window.dadosExcelRaw);
    
    if (window.dadosExcelRaw && window.dadosExcelRaw.length > 0) {
        const primeiro = window.dadosExcelRaw[0];
        console.log('📊 Primeiro Excel:', primeiro);
        console.log('📊 Bairro Excel:', primeiro[' Bairros ']);
    }
}

// ================================
// INICIALIZAÇÃO DOS MÓDULOS
// ================================
function initializeCharts() {
    console.log('📊 Charts inicializados');
    if (window.initializeCharts && typeof window.initializeCharts === 'function') {
        try {
            window.initializeCharts();
        } catch (error) {
            console.error('❌ Erro charts:', error);
        }
    }
}

function initializeFilters() {
    console.log('🔍 Filtros inicializados');
    if (window.initializeFilters && typeof window.initializeFilters === 'function') {
        try {
            window.initializeFilters();
        } catch (error) {
            console.error('❌ Erro filtros:', error);
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
            if (window.clearSelection) window.clearSelection();
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
// INICIALIZAÇÃO PRINCIPAL
// ================================
async function initializeDashboard() {
    console.log('📊 === SOLARMAP - VERSÃO LIMPA COM CORREÇÃO NUMÉRICA ===');
    
    try {
        // Verificações básicas
        if (window.location.protocol === 'file:') {
            console.error('❌ Use Live Server!');
            showMessage('❌ Use Live Server!');
            return;
        }
        
        console.log('✅ Live Server detectado');
        
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX não carregada');
        }
        console.log('✅ XLSX disponível');
        
        // 1. Executar merge
        console.log('🔗 1/5 - Executando merge...');
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
        
        // Atualizar filtros
        if (window.populateBairroSelect) {
            window.populateBairroSelect();
        }
        
        console.log('✅ === DASHBOARD LIMPO INICIALIZADO COM CORREÇÃO! ===');
        showMessage('✅ SolarMap carregado com dados corrigidos e normalização numérica!');
        
        // Estatísticas finais
        console.log('📊 === ESTATÍSTICAS FINAIS ===');
        console.log(`📍 Dados: ${dadosCompletos.length} itens`);
        console.log(`🗺️ Polígonos: ${window.layerGroup?.getLayers().length || 0}`);
        console.log(`🏘️ Bairros: ${Object.keys(estatisticasPorBairro).length}`);
        
        const dadosVinculados = dadosCompletos.filter(item => item.isLinked);
        console.log(`📋 Taxa vinculação: ${dadosVinculados.length}/${dadosCompletos.length} (${((dadosVinculados.length/dadosCompletos.length)*100).toFixed(1)}%)`);
        
        const dadosComValores = dadosCompletos.filter(item => 
            item.properties.area_edificacao > 0 || 
            item.properties.producao_telhado > 0 || 
            item.properties.capacidade_por_m2 > 0
        );
        console.log(`📈 Dados válidos: ${dadosComValores.length} (${((dadosComValores.length/dadosCompletos.length)*100).toFixed(1)}%)`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showMessage(`❌ Erro: ${error.message}`);
        throw error;
    }
}

// ================================
// FUNÇÕES AUXILIARES
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
                        reject(new Error('Timeout: Mapa não criado'));
                    }
                }, 5000);
            } else {
                reject(new Error('initMap não encontrada'));
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
                        console.warn('⚠️ Timeout polígonos, continuando...');
                        clearInterval(checkProgress);
                        resolve();
                    }
                }, 500);
            } else {
                reject(new Error('addPolygonsToMap não encontrada'));
            }
        } catch (error) {
            console.warn('⚠️ Erro polígonos, continuando:', error);
            resolve();
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
window.formatNumber = formatNumber;
window.diagnosticDataDetailed = diagnosticDataDetailed;
window.getMediaDoBairro = getMediaDoBairro;
window.updateInfoCards = updateInfoCards;
window.updateRelatorio = updateRelatorio;
window.estatisticasMerge = estatisticasMerge;
window.executarMergeCompleto = executarMergeCompleto;
window.converterSIRGAS2000ParaWGS84 = converterSIRGAS2000ParaWGS84;

// ================================
// EXPORTAÇÕES ADICIONAIS (CORREÇÃO NUMÉRICA)
// ================================
window.converterNumeroCorreto = converterNumeroCorreto;
window.testarConversaoNumeros = testarConversaoNumeros;
window.reprocessarDados = reprocessarDados;
window.processarDadosMensais = processarDadosMensais;

console.log('✅ DASHBOARD LIMPO E COMPLETO CARREGADO COM CORREÇÃO NUMÉRICA!');
console.log('🔍 Execute diagnosticDataDetailed() para diagnóstico');
console.log('🧪 Execute testarConversaoNumeros() para testar conversão');
console.log('🔄 Execute reprocessarDados() para reaplicar correção');
console.log('🧪 Execute window.dadosExcelRaw?.[0] para ver dados Excel');
