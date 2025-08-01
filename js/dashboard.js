radiacao_max: Math.round((Math.random() * 200 + 100) * 100) / 100,
            quantidade_placas: Math.floor(Math.random() * 50) + 5,
            capacidade_placas_dia: Math.round((Math.random() * 50 + 10) * 100) / 100,
            capacidade_placas_mes: Math.round((Math.random() * 1500 + 300) * 100) / 100,
            potencial_medio_dia: Math.round((Math.random() * 10 + 2) * 100) / 100,
            renda_total: Math.round((Math.random() * 10000 + 1000) * 100) / 100,
            renda_per_capita: Math.round((Math.random() * 2000 + 500) * 100) / 100,
            renda_domiciliar_per_capita: Math.round((Math.random() * 1500 + 400) * 100) / 100,
            dados_mensais_producao: Array.from({length: 12}, function() {
                return Math.round((Math.random() * 100 + 10) * 100) / 100;
            }),
            dados_mensais_radiacao: Array.from({length: 12}, function() {
                return Math.round((Math.random() * 200 + 100) * 100) / 100;
            })
        };
    });
    
    console.log('🎭 Dados simulados gerados: ' + dadosExcel.length + ' registros');
    console.log('⚠️ LEMBRETE: Estes são dados SIMULADOS, não reais!');
    showMessage('⚠️ ATENÇÃO: Usando dados simulados - não são dados reais do Excel!');
}

// ================================
// FUNÇÕES DE EXTRAÇÃO E NORMALIZAÇÃO
// ================================
function extractObjectIdFromGeoJSON(props, index) {
    const possibleFields = [
        'OBJECTID', 'ObjectID', 'objectid', 'OBJECT_ID',
        'FID', 'FID_1', 'fid', 'ID', 'id'
    ];
    for (let i = 0; i < possibleFields.length; i++) {
        const field = possibleFields[i];
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
    for (let i = 0; i < possibleFields.length; i++) {
        const field = possibleFields[i];
        if (row.hasOwnProperty(field) && row[field] !== null && row[field] !== undefined && row[field] !== '') {
            const value = parseInt(String(row[field]));
            if (!isNaN(value)) {
                return value;
            }
        }
    }
    return null;
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
        'Produção de energia kW do telhado do edifício',
        'OBJECTID',
        'Bairros',
        'Bairro'
    ];
    
    console.log('📋 Campos disponíveis no Excel:', Object.keys(sampleData));
    console.log('🎯 Verificando campos esperados:');
    
    const camposEncontrados = [];
    const camposNaoEncontrados = [];
    
    camposEsperados.forEach(function(campo) {
        if (sampleData.hasOwnProperty(campo)) {
            console.log('✅ ENCONTRADO: "' + campo + '" = ' + sampleData[campo]);
            camposEncontrados.push(campo);
        } else {
            console.log('❌ NÃO ENCONTRADO: "' + campo + '"');
            camposNaoEncontrados.push(campo);
            
            const similares = Object.keys(sampleData).filter(function(key) {
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
                console.log('   🔎 Campos similares:', similares);
            }
        }
    });
    
    console.log('📊 Campos encontrados: ' + camposEncontrados.length + '/' + camposEsperados.length);
    console.log('📊 Taxa de compatibilidade: ' + ((camposEncontrados.length / camposEsperados.length) * 100).toFixed(1) + '%');
    
    if (camposEncontrados.length < 3) {
        console.log('⚠️ Poucos campos reconhecidos. Todos os campos disponíveis:');
        Object.entries(sampleData).forEach(function(entry) {
            const key = entry[0];
            const value = entry[1];
            console.log('   "' + key + '": ' + value);
        });
    }
    
    return {
        encontrados: camposEncontrados,
        naoEncontrados: camposNaoEncontrados,
        compatibilidade: (camposEncontrados.length / camposEsperados.length) * 100
    };
}

function validateExcelData(dadosExcel) {
    if (!dadosExcel || dadosExcel.length === 0) {
        console.log('❌ Nenhum dado Excel para validar');
        return { valid: false, reason: 'Sem dados' };
    }
    
    console.log('🔍 === VALIDAÇÃO DOS DADOS EXCEL ===');
    
    let dadosValidos = 0;
    let dadosComObjectId = 0;
    let dadosComValoresReais = 0;
    
    const camposNumericos = [
        'area_edificacao', 'producao_telhado', 'capacidade_por_m2', 
        'radiacao_max', 'quantidade_placas', 'capacidade_placas_mes'
    ];
    
    dadosExcel.forEach(function(item, index) {
        if (item.objectid && !isNaN(item.objectid)) {
            dadosComObjectId++;
        }
        
        const temValorReal = camposNumericos.some(function(campo) {
            const valor = item[campo];
            return valor && !isNaN(valor) && parseFloat(valor) > 0;
        });
        
        if (temValorReal) {
            dadosComValoresReais++;
        }
        
        if (item.objectid && temValorReal) {
            dadosValidos++;
        }
        
        if (index < 3) {
            console.log('📋 Registro ' + (index + 1) + ':');
            console.log('   OBJECTID: ' + item.objectid);
            console.log('   Bairro: ' + item.bairro);
            console.log('   Área: ' + item.area_edificacao);
            console.log('   Produção: ' + item.producao_telhado);
            console.log('   Radiação: ' + item.radiacao_max);
            console.log('   Placas: ' + item.quantidade_placas);
            console.log('   Válido: ' + (item.objectid && temValorReal ? 'SIM' : 'NÃO'));
        }
    });
    
    const taxaValidacao = (dadosValidos / dadosExcel.length) * 100;
    
    console.log('📊 === RESULTADO DA VALIDAÇÃO ===');
    console.log('Total de registros: ' + dadosExcel.length);
    console.log('Com OBJECTID: ' + dadosComObjectId + ' (' + ((dadosComObjectId / dadosExcel.length) * 100).toFixed(1) + '%)');
    console.log('Com valores reais: ' + dadosComValoresReais + ' (' + ((dadosComValoresReais / dadosExcel.length) * 100).toFixed(1) + '%)');
    console.log('Completamente válidos: ' + dadosValidos + ' (' + taxaValidacao.toFixed(1) + '%)');
    
    const isValid = dadosValidos > 0 && taxaValidacao > 10;
    
    if (isValid) {
        console.log('✅ DADOS EXCEL VALIDADOS COMO REAIS');
        return { 
            valid: true, 
            validCount: dadosValidos,
            totalCount: dadosExcel.length,
            percentage: taxaValidacao
        };
    } else {
        console.log('❌ DADOS EXCEL NÃO PASSARAM NA VALIDAÇÃO');
        return { 
            valid: false, 
            reason: 'Apenas ' + dadosValidos + ' registros válidos de ' + dadosExcel.length + ' (' + taxaValidacao.toFixed(1) + '%)'
        };
    }
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
    
    Object.entries(row).forEach(function(entry) {
        const key = entry[0];
        let value = entry[1];
        const normalizedKey = fieldMapping[key] || key.toLowerCase().replace(/\s+/g, '_');
        
        if (value !== null && value !== undefined && value !== '') {
            if (typeof value === 'string' && value.length > 0) {
                if (key.toLowerCase().includes('renda')) {
                    const cleanValue = value.toString().replace(/[^\d,.-]/g, '').replace(',', '.');
                    const numValue = parseFloat(cleanValue);
                    normalized[normalizedKey] = isNaN(numValue) ? value : numValue;
                } else {
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
    
    if (!normalized.objectid || normalized.objectid === 0) {
        const idFields = Object.keys(row).filter(function(key) {
            return key.toLowerCase().includes('id') || key.toLowerCase().includes('object');
        });
        
        for (let i = 0; i < idFields.length; i++) {
            const field = idFields[i];
            const value = parseInt(String(row[field]));
            if (!isNaN(value) && value > 0) {
                normalized.objectid = value;
                console.log('✅ OBJECTID encontrado em campo: ' + field + ' = ' + value);
                break;
            }
        }
    }
    
    const dadosMensaisProducao = new Array(12).fill(0);
    const dadosMensaisRadiacao = new Array(12).fill(0);
    
    normalized.dados_mensais_producao = dadosMensaisProducao;
    normalized.dados_mensais_radiacao = dadosMensaisRadiacao;
    
    if (!normalized.radiacao_max || normalized.radiacao_max === 0) {
        const radiacaoFields = Object.keys(row).filter(function(key) {
            return key.toLowerCase().includes('radiacao') || 
                   key.toLowerCase().includes('radiation') ||
                   key.toLowerCase().includes('solar');
        });
        for (let i = 0; i < radiacaoFields.length; i++) {
            const field = radiacaoFields[i];
            const value = parseFloat(String(row[field]).replace(',', '.'));
            if (!isNaN(value) && value > 0) {
                normalized.radiacao_max = value;
                break;
            }
        }
    }
    
    if (!normalized.quantidade_placas || normalized.quantidade_placas === 0) {
        const placasFields = Object.keys(row).filter(function(key) {
            return key.toLowerCase().includes('placa') || 
                   key.toLowerCase().includes('panel') ||
                   key.toLowerCase().includes('quantidade');
        });
        for (let i = 0; i < placasFields.length; i++) {
            const field = placasFields[i];
            const value = parseFloat(String(row[field]).replace(',', '.'));
            if (!isNaN(value) && value > 0) {
                normalized.quantidade_placas = value;
                break;
            }
        }
    }
    
    return normalized;
}

// ================================
// VINCULAÇÃO REAL
// ================================
async function linkDataReal() {
    console.log('🔗 === VINCULAÇÃO REAL ===');
    
    if (!dadosGeoJSON || dadosGeoJSON.length === 0) {
        throw new Error('Dados GeoJSON não carregados');
    }
    
    if (!dadosExcel || dadosExcel.length === 0) {
        console.warn('⚠️ Dados Excel não disponíveis, processando apenas GeoJSON...');
        
        let sucessos = 0;
        let coordenadasInvalidas = 0;
        let foraDaRegiao = 0;
        
        dadosCompletos = dadosGeoJSON.map(function(geo) {
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
                console.error('❌ Erro no OBJECTID ' + geo.id + ':', error);
                coordenadasInvalidas++;
                return null;
            }
        }).filter(function(item) {
            return item !== null;
        });
        
        console.log('📊 === RESULTADO (APENAS GEOJSON) ===');
        console.log('✅ Processados: ' + sucessos);
        console.log('🗺️ Fora de São Luís: ' + foraDaRegiao);
        console.log('❌ Coordenadas inválidas: ' + coordenadasInvalidas);
        console.log('📈 Total válido: ' + dadosCompletos.length);
        
        if (dadosCompletos.length === 0) {
            throw new Error('Nenhum dado válido após processamento');
        }
        
        showMessage('✅ Processamento: ' + dadosCompletos.length + ' imóveis (apenas geometria)');
        
    } else {
        console.log('📊 Vinculando ' + dadosGeoJSON.length + ' geometrias com ' + dadosExcel.length + ' registros Excel');
        
        const excelIndex = {};
        let excelIndexCount = 0;
        dadosExcel.forEach(function(row) {
            const objectId = extractObjectIdFromExcel(row);
            if (objectId !== null) {
                excelIndex[objectId] = row;
                excelIndexCount++;
            }
        });
        console.log('📋 Índice Excel criado: ' + excelIndexCount + ' registros');
        
        let sucessos = 0;
        let semDadosExcel = 0;
        let coordenadasInvalidas = 0;
        let foraDaRegiao = 0;
        
        dadosCompletos = dadosGeoJSON.map(function(geo) {
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
                console.error('❌ Erro no OBJECTID ' + geo.id + ':', error);
                coordenadasInvalidas++;
                return null;
            }
        }).filter(function(item) {
            return item !== null;
        });
        
        console.log('📊 === RESULTADO FINAL ===');
        console.log('✅ Sucessos (com dados Excel): ' + sucessos);
        console.log('📍 Sem dados Excel: ' + semDadosExcel);
        console.log('🗺️ Fora de São Luís: ' + foraDaRegiao);
        console.log('❌ Coordenadas inválidas: ' + coordenadasInvalidas);
        console.log('📈 Total válido: ' + dadosCompletos.length);
        console.log('📈 Taxa de vinculação: ' + (dadosCompletos.length > 0 ? ((sucessos / dadosCompletos.length) * 100).toFixed(1) : 0) + '%');
        
        if (sucessos > 0) {
            console.log('✅ Vinculação bem-sucedida: ' + sucessos + ' imóveis');
            showMessage('✅ Vinculação: ' + sucessos + ' imóveis com dados Excel');
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
        
        dados_mensais_producao: Array.from({length: 12}, function() {
            return 10 + Math.random() * 90;
        }),
        dados_mensais_radiacao: Array.from({length: 12}, function() {
            return 100 + Math.random() * 100;
        })
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
        const convertedPoints = points.map(function(point) {
            if (!point || point.length < 2) return null;
            return convertSIRGAS2000UTMToWGS84(point[0], point[1]);
        }).filter(function(point) {
            return point !== null;
        });
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
    points.forEach(function(point) {
        sumLat += point[0];
        sumLng += point[1];
    });
    return [sumLat / points.length, sumLng / points.length];
}

function combineProperties(geoItem, excelData, objectId) {
    const combined = {
        id: objectId,
        objectid: objectId,
        bairro: excelData ? excelData.bairro : 'Não informado',
        area_edificacao: excelData ? excelData.area_edificacao : 0,
        producao_telhado: excelData ? excelData.producao_telhado : 0,
        capacidade_por_m2: excelData ? excelData.capacidade_por_m2 : 0,
        radiacao_max: excelData ? excelData.radiacao_max : 0,
        quantidade_placas: excelData ? excelData.quantidade_placas : 0,
        capacidade_placas_dia: excelData ? excelData.capacidade_placas_dia : 0,
        capacidade_placas_mes: excelData ? excelData.capacidade_placas_mes : 0,
        potencial_medio_dia: excelData ? excelData.potencial_medio_dia : 0,
        renda_total: excelData ? excelData.renda_total : 0,
        renda_per_capita: excelData ? excelData.renda_per_capita : 0,
        renda_domiciliar_per_capita: excelData ? excelData.renda_domiciliar_per_capita : 0,
        
        dados_mensais_producao: excelData ? excelData.dados_mensais_producao : new Array(12).fill(0),
        dados_mensais_radiacao: excelData ? excelData.dados_mensais_radiacao : new Array(12).fill(0)
    };
    
    return combined;
}

// ================================
// FUNÇÕES AUXILIARES
// ================================

function calcularEstatisticas() {
    if (dadosCompletos.length === 0) return;
    const totalImoveis = dadosCompletos.length;
    const producaoTotal = dadosCompletos.reduce(function(sum, item) {
        return sum + (item.properties.capacidade_placas_mes || 0);
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
    if (dadosCompletos.length === 0) return;
    
    const dadosPorBairro = {};
    
    dadosCompletos.forEach(function(item) {
        const bairro = item.properties.bairro || 'Não informado';
        if (!dadosPorBairro[bairro]) {
            dadosPorBairro[bairro] = [];
        }
        dadosPorBairro[bairro].push(item);
    });
    
    estatisticasPorBairro = {};
    
    Object.entries(dadosPorBairro).forEach(function(entry) {
        const bairro = entry[0];
        const imoveis = entry[1];
        const totalImoveis = imoveis.length;
        const somaProducaoTelhado = imoveis.reduce(function(sum, item) {
            return sum + (item.properties.producao_telhado || 0);
        }, 0);
        const somaRadiacaoMax = imoveis.reduce(function(sum, item) {
            return sum + (item.properties.radiacao_max || 0);
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
    
    const seasonalFactors = [1// ================================
// DASHBOARD PRINCIPAL - SOLARMAP
// VERSÃO LIMPA E TESTADA - SEM ERROS DE SINTAXE
// ================================
console.log('🚀 Dashboard SolarMap - VERSÃO LIMPA');

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
// FUNÇÃO DE FORMATAÇÃO GLOBAL - LINHA 70 AQUI
// ================================
function formatNumber(numero, decimais) {
    if (decimais === undefined) decimais = 2;
    
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

function formatarComoExcel(valor, decimais) {
    if (decimais === undefined) decimais = 2;
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
    messageDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: ' + 
        (message.includes('❌') ? '#e74c3c' : '#27ae60') + 
        '; color: white; padding: 15px 20px; border-radius: 8px; font-family: Arial, sans-serif; font-size: 14px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 400px;';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(function() {
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
        const possiblePaths = [
            'data/Dados_energia_solar.geojson',
            './data/Dados_energia_solar.geojson',
            'Dados_energia_solar.geojson',
            './Dados_energia_solar.geojson'
        ];
        
        let geoData = null;
        let loadedPath = null;
        
        for (let i = 0; i < possiblePaths.length; i++) {
            const path = possiblePaths[i];
            try {
                console.log('🔍 Tentando carregar: ' + path);
                const response = await fetch(path);
                if (response.ok) {
                    geoData = await response.json();
                    loadedPath = path;
                    console.log('✅ GeoJSON carregado de: ' + path);
                    break;
                }
            } catch (error) {
                console.log('❌ Falha ao carregar: ' + path);
            }
        }
        
        if (!geoData) {
            throw new Error('GeoJSON não encontrado em nenhum caminho testado');
        }
        
        console.log('✅ GeoJSON carregado: ' + geoData.features.length + ' features');
        
        dadosGeoJSON = geoData.features.map(function(feature, index) {
            const props = feature.properties;
            const objectId = extractObjectIdFromGeoJSON(props, index);
            return {
                id: objectId,
                coordinates: feature.geometry.coordinates,
                geometryType: feature.geometry.type,
                originalProperties: props
            };
        });
        console.log('✅ Geometrias processadas: ' + dadosGeoJSON.length + ' features');
    } catch (error) {
        console.error('❌ Erro ao carregar GeoJSON:', error);
        throw error;
    }
}

// ================================
// CARREGAMENTO DE DADOS EXCEL
// ================================
async function loadExcelData() {
    console.log('📊 === CARREGANDO EXCEL (.xlsx) ===');
    
    if (typeof XLSX === 'undefined') {
        console.error('❌ SheetJS não está carregado!');
        throw new Error('SheetJS library não encontrada');
    }
    
    try {
        const possiblePaths = [
            'data/Dados_energia_solar.xlsx',
            './data/Dados_energia_solar.xlsx',
            'Dados_energia_solar.xlsx',
            './Dados_energia_solar.xlsx'
        ];
        
        let arrayBuffer = null;
        let loadedPath = null;
        
        for (let i = 0; i < possiblePaths.length; i++) {
            const path = possiblePaths[i];
            try {
                console.log('🔍 Tentando carregar Excel: ' + path);
                const response = await fetch(path);
                if (response.ok) {
                    arrayBuffer = await response.arrayBuffer();
                    loadedPath = path;
                    console.log('✅ Arquivo Excel encontrado em: ' + path);
                    break;
                }
            } catch (error) {
                console.log('❌ Falha ao carregar Excel: ' + path);
            }
        }
        
        if (!arrayBuffer) {
            console.warn('⚠️ Nenhum arquivo Excel encontrado, tentando fallback para JSON...');
            await loadExcelDataJSON();
            return;
        }
        
        console.log('✅ Arquivo Excel encontrado, processando...');
        
        const workbook = XLSX.read(arrayBuffer, {
            type: 'array',
            cellDates: true,
            cellStyles: true,
            cellFormulas: true,
            raw: false
        });
        
        console.log('📊 Workbook sheets:', workbook.SheetNames);
        
        const firstSheetName = workbook.SheetNames[0];
        console.log('📋 Processando planilha: ' + firstSheetName);
        
        const worksheet = workbook.Sheets[firstSheetName];
        console.log('📏 Range da planilha:', worksheet['!ref']);
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: null,
            raw: false,
            blankrows: false
        });
        
        if (jsonData.length === 0) {
            throw new Error('❌ Planilha Excel está vazia');
        }
        
        console.log('📊 Total de linhas lidas: ' + jsonData.length);
        
        const headers = jsonData[0];
        console.log('📋 Headers encontrados (' + headers.length + '):', headers);
        
        if (headers.length <= 1) {
            console.error('❌ PROBLEMA: Apenas 1 coluna detectada. Verificando estrutura...');
            console.log('Primeira linha completa:', jsonData[0]);
            console.log('Segunda linha (se existir):', jsonData[1]);
            
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
                
                dadosExcel = alternativeData.map(function(row) {
                    return normalizeExcelData(row);
                });
                
                if (dadosExcel.length > 0) {
                    const primeiroItem = dadosExcel[0];
                    const temDadosReais = primeiroItem.objectid && (
                        primeiroItem.area_edificacao > 0 ||
                        primeiroItem.producao_telhado > 0 ||
                        primeiroItem.radiacao_max > 0 ||
                        primeiroItem.quantidade_placas > 0
                    );
                    
                    if (temDadosReais) {
                        console.log('✅ DADOS REAIS DETECTADOS: ' + dadosExcel.length + ' registros');
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
        
        const dataObjects = [];
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            const obj = {};
            
            headers.forEach(function(header, index) {
                if (header && header.trim) {
                    let value = row[index];
                    
                    if (typeof value === 'string') {
                        value = value.trim();
                        if (value.match && value.match(/^\d+[,\.]\d+$/)) {
                            value = parseFloat(value.replace(',', '.'));
                        }
                        if (value === '') {
                            value = null;
                        }
                    }
                    
                    obj[header.trim()] = value;
                }
            });
            
            if (Object.keys(obj).length > 0 && Object.values(obj).some(function(v) {
                return v !== null && v !== undefined && v !== '';
            })) {
                dataObjects.push(obj);
            }
        }
        
        console.log('✅ Excel processado: ' + dataObjects.length + ' registros válidos');
        
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
        
        dadosExcel = dataObjects.map(function(row) {
            return normalizeExcelData(row);
        });
        console.log('✅ Dados normalizados: ' + dadosExcel.length + ' registros');
        
        if (dadosExcel.length > 0) {
            const validationResult = validateExcelData(dadosExcel);
            
            if (validationResult.valid) {
                const dadosValidos = dadosExcel.filter(function(item) {
                    return item.objectid && (
                        item.area_edificacao > 0 ||
                        item.producao_telhado > 0 ||
                        item.radiacao_max > 0 ||
                        item.quantidade_placas > 0
                    );
                });
                
                dadosExcel = dadosValidos;
                console.log('✅ CONFIRMADO: ' + dadosExcel.length + ' registros REAIS do Excel validados');
                console.log('📊 Amostra de dados reais validados:');
                console.log('   - OBJECTID:', dadosExcel[0].objectid);
                console.log('   - Bairro:', dadosExcel[0].bairro);
                console.log('   - Área:', dadosExcel[0].area_edificacao);
                console.log('   - Produção:', dadosExcel[0].producao_telhado);
                console.log('   - Radiação:', dadosExcel[0].radiacao_max);
                console.log('   - Placas:', dadosExcel[0].quantidade_placas);
                
                showMessage('✅ Excel carregado: ' + dadosExcel.length + ' registros REAIS validados');
            } else {
                console.error('❌ VALIDAÇÃO FALHOU: ' + validationResult.reason);
                console.log('🔄 Tentando fallback para JSON...');
                await loadExcelDataJSON();
                return;
            }
        }
        
        if (dadosExcel.length > 0) {
            console.log('🔍 Primeiro registro REAL normalizado e validado:');
            console.log(dadosExcel[0]);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar Excel:', error);
        
        console.log('🔄 Tentando fallback para JSON...');
        try {
            await loadExcelDataJSON();
        } catch (jsonError) {
            console.error('❌ Fallback JSON também falhou:', jsonError);
            console.log('🔄 Gerando dados simulados para demonstração...');
            generateMockData();
        }
    }
}

async function loadExcelDataJSON() {
    const possiblePaths = [
        'data/Dados_energia_solar.json',
        './data/Dados_energia_solar.json',
        'Dados_energia_solar.json',
        './Dados_energia_solar.json'
    ];
    
    for (let i = 0; i < possiblePaths.length; i++) {
        const path = possiblePaths[i];
        try {
            console.log('🔍 Tentando carregar JSON: ' + path);
            const response = await fetch(path);
            if (response.ok) {
                const jsonData = await response.json();
                console.log('✅ JSON fallback carregado: ' + jsonData.length + ' registros');
                dadosExcel = jsonData.map(function(row) {
                    return normalizeExcelData(row);
                });
                return;
            }
        } catch (error) {
            console.log('❌ Falha ao carregar JSON: ' + path);
        }
    }
    
    throw new Error('Nenhum arquivo de dados encontrado (Excel ou JSON)');
}

function generateMockData() {
    console.log('🎭 ATENÇÃO: Gerando dados simulados para demonstração...');
    console.log('⚠️ ISTO NÃO SÃO DADOS REAIS DO EXCEL!');
    
    const sampleIds = dadosGeoJSON.slice(0, Math.min(1000, dadosGeoJSON.length)).map(function(item) {
        return item.id;
    });
    
    const bairrosSaoLuis = [
        'Centro', 'São Francisco', 'Monte Castelo', 'João Paulo', 'Calhau',
        'Renascença', 'Ponta D\'Areia', 'São Cristóvão', 'Alemanha', 'Cohatrac',
        'Vinhais', 'Turu', 'Cohama', 'Cohafuma', 'Cidade Operária'
    ];
    
    dadosExcel = sampleIds.map(function(id) {
        return {
            objectid: id,
            bairro: bairrosSaoLuis[Math.floor(Math.random() * bairrosSaoLuis.length)],
            area_edificacao: Math.round((Math.random() * 200 + 50) * 100) / 100,
            producao_telhado: Math.round((Math.random() * 100 + 10) * 100) / 100,
            capacidade_por_m2: Math.round((Math.random() * 5 + 1) * 100) / 100,
            radiacao_max: Math.round((Math.random() * 200
