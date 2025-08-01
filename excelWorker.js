// excelWorker.js
// Este script é executado em um Web Worker, em um thread separado do principal.

// Importa a biblioteca SheetJS. É crucial que esta URL esteja acessível.
// [18, 19]
importScripts("https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js");

// ================================
// FUNÇÕES DE UTILIDADE (DUPLICADAS NO WORKER PARA AUTONOMIA)
// ================================

/**
 * Remove diacríticos (acentos) de uma string e a converte para minúsculas.
 * @param {string} str - A string a ser normalizada.
 * @returns {string} A string normalizada.
 */
function toNormalForm(str) {
    if (typeof str!== 'string') return str;
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Extrai o OBJECTID de uma linha de dados Excel.
 * Tenta vários nomes de campos comuns e converte para número.
 * @param {object} row - Objeto de linha de dados Excel.
 * @returns {number|null} O OBJECTID ou null se não encontrado/inválido.
 */
function extractObjectIdFromExcel(row) {
    const possibleFields =;
    for (const field of possibleFields) {
        if (row.hasOwnProperty(field) && row[field]!== null && row[field]!== undefined && row[field]!== '') {
            const value = parseInt(String(row[field]));
            if (!isNaN(value)) {
                return value;
            }
        }
    }
    return null;
}

/**
 * Normaliza os dados de uma linha do Excel, mapeando nomes de campos e convertendo tipos.
 * [8, 9, 10, 11, 12, 5, 13, 14]
 * @param {object} row - A linha de dados original do Excel.
 * @returns {object} A linha de dados normalizada.
 */
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
        // DADOS MENSAIS DE RADIAÇÃO
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

    Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = fieldMapping[key] |

| toNormalForm(key).replace(/[^a-z0-9_]/g, '');
        let processedValue = value;

        if (typeof value === 'string' && value.length > 0) {
            const cleanedValue = value.replace(/\./g, '').replace(',', '.');
            const numValue = parseFloat(cleanedValue);

            if (key.includes('Renda') |

| key.includes('renda')) {
                processedValue = isNaN(numValue)? value : numValue;
            } else {
                processedValue = isNaN(numValue)? value : numValue;
            }
        } else if (value === null |

| value === undefined |
| value === '') {
            if (['area_edificacao', 'producao_telhado', 'capacidade_por_m2', 'radiacao_max', 'quantidade_placas', 'capacidade_placas_dia', 'capacidade_placas_mes', 'potencial_medio_dia'].includes(normalizedKey) |

| normalizedKey.startsWith('producao_') |
| normalizedKey.startsWith('radiacao_')) {
                processedValue = 0;
            } else {
                processedValue = value;
            }
        }
        normalized[normalizedKey] = processedValue;
    });

    const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    normalized.dados_mensais_producao = meses.map(mes => normalized[`producao_${mes}`] |

| 0);
    normalized.dados_mensais_radiacao = meses.map(mes => normalized[`radiacao_${mes}`] |

| 0);

    normalized.objectid = extractObjectIdFromExcel(row) |

| normalized.objectid |
| null;

    return normalized;
}

/**
 * Realiza uma validação básica nos dados normalizados do Excel.
 * @param {Array<object>} data - Array de objetos de dados normalizados.
 * @returns {{valid: boolean, reason: string}} Resultado da validação.
 */
function validateExcelData(data) {
    if (!data |

| data.length === 0) {
        return { valid: false, reason: 'Nenhum registro de dados encontrado ou todos são inválidos.' };
    }

    const firstItem = data;
    if (!firstItem.objectid) {
        return { valid: false, reason: 'Campo "objectid" ausente ou inválido no primeiro registro.' };
    }

    const hasMeaningfulData = data.some(item =>
        (item.area_edificacao > 0 ||
        item.producao_telhado > 0 ||
        item.radiacao_max > 0 ||
        item.quantidade_placas > 0)
    );

    if (!hasMeaningfulData) {
        return { valid: false, reason: 'Nenhum registro contém dados numéricos significativos (área, produção, radiação, placas).' };
    }

    return { valid: true, reason: 'Dados Excel validados com sucesso.' };
}

// ================================
// LÓGICA DO WEB WORKER
// ================================
self.addEventListener('message', async (e) => {
    if (e.data.command === 'loadExcel') {
        const paths = e.data.paths;
        let arrayBuffer = null;
        let loadedPath = null;

        try {
            self.postMessage({ status: 'progress', message: 'Iniciando busca do arquivo Excel...' });
            for (const path of paths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        arrayBuffer = await response.arrayBuffer();
                        loadedPath = path;
                        self.postMessage({ status: 'progress', message: `Arquivo Excel encontrado em: ${path}` });
                        break;
                    }
                } catch (error) {
                    // Ignorar erros de fetch para tentar o próximo caminho
                }
            }

            if (!arrayBuffer) {
                throw new Error('Nenhum arquivo Excel encontrado nos caminhos fornecidos.');
            }

            self.postMessage({ status: 'progress', message: 'Processando arquivo Excel...' });

            // Usar SheetJS para ler o arquivo Excel em modo denso para otimização de memória
            const workbook = XLSX.read(arrayBuffer, {
                type: 'array',
                cellDates: true,
                cellStyles: true,
                cellFormulas: true,
                raw: false, // Importante para obter valores formatados
                dense: true // Otimização de memória para grandes datasets [18, 20]
            });

            const firstSheetName = workbook.SheetNames;
            const worksheet = workbook.Sheets;

            // Converter para JSON. Tentar com header:1 primeiro, depois sem.
            let jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: null,
                raw: false,
                blankrows: false
            });

            let headers = jsonData;
            let dataRows = jsonData.slice(1);

            // Se a detecção de cabeçalho falhar (ex: apenas 1 coluna detectada), tentar sem header:1
            if (!headers |

| headers.length <= 1) {
                self.postMessage({ status: 'progress', message: 'Tentando método alternativo de leitura de Excel (JSON direto)...' });
                jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    defval: null,
                    raw: false,
                    blankrows: false
                });
                if (jsonData.length > 0) {
                    headers = Object.keys(jsonData); // Assumir que as chaves do primeiro objeto são os headers
                    dataRows = jsonData;
                } else {
                    throw new Error('Planilha Excel está vazia ou não pôde ser lida.');
                }
            }

            const dataObjects = dataRows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    if (header && header.trim()) {
                        obj[header.trim()] = row[index];
                    }
                });
                return obj;
            }).filter(obj => Object.keys(obj).length > 0 && Object.values(obj).some(v => v!== null && v!== undefined && v!== ''));

            self.postMessage({ status: 'progress', message: `Normalizando ${dataObjects.length} registros...` });
            const normalizedData = dataObjects.map(row => normalizeExcelData(row));

            const validationResult = validateExcelData(normalizedData);

            if (validationResult.valid) {
                self.postMessage({ status: 'completed', data: normalizedData });
            } else {
                throw new Error(`Validação de dados Excel falhou: ${validationResult.reason}`);
            }

        } catch (error) {
            self.postMessage({ status: 'error', message: error.message, error: error.stack });
        }
    }
});
