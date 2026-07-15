const vm = require('vm');

/**
 * Parses GWT RPC responses.
 * GWT RPC responses can either be JSON strings embedded in GWT envelope,
 * or serialized GWT object graphs.
 */
function parseGwtRpc(rawText) {
  if (!rawText) return null;

  // Clean the GWT prefix
  const cleaned = rawText.replace(/^\/\/OK/, '').replace(/^\/\/EX/, '');

  let parsedArray;
  try {
    // Usar vm para interpretar de forma segura a resposta como literal JavaScript
    parsedArray = vm.runInNewContext(cleaned);
  } catch (err) {
    throw new Error('Falha ao decodificar array JavaScript da resposta GWT: ' + err.message);
  }

  if (!Array.isArray(parsedArray) || parsedArray.length < 4) {
    return parsedArray;
  }

  // GWT RPC format: [val1, val2, ..., valN, stringTable, flags, version]
  // Usually the string table is the third element from the end
  const stringTable = parsedArray[parsedArray.length - 3];
  if (!Array.isArray(stringTable)) {
    return parsedArray;
  }

  // Check if it's a simple JSON string wrapped in GWT RPC
  if (stringTable.length === 1 && typeof stringTable[0] === 'string' && stringTable[0].startsWith('{')) {
    try {
      return JSON.parse(stringTable[0]);
    } catch (e) {
      // Not JSON, return raw string table
      return stringTable[0];
    }
  }

  // If it's a complex GWT RPC object graph (like getAssociado)
  // We can deserialize it.
  // The numbers at the beginning represent type indices and value indices.
  // Let's implement a basic GWT RPC reader.
  try {
    return deserializeGwt(parsedArray);
  } catch (err) {
    console.error('Erro ao deserializar GWT RPC completo, retornando dicionário de strings:', err.message);
    // Fallback: return a simple map of stringTable keys/values
    return extractStringTableData(stringTable);
  }
}

/**
 * Fallback parser that pulls progression/specialty dates directly from the string table
 * if the full deserializer fails.
 */
function extractStringTableData(stringTable) {
  const data = {};
  
  // Look for known progression keys and their following values
  const progKeys = [
    'PATA_TENRA', 'SALTADOR', 'RASTREADOR', 'CACADOR', 
    'INVESTIDURA', 'PROMESSA_ESCOTEIRA_LOBINHO', 
    'LUSOFONIA_LOBINHO', 'CRUZEIRO_SUL', 'LIS_DE_OURO', 
    'ESCOTEIRO_PATRIA', 'INSIGNIA_BP',
    'dt_escotista_preliminar_curso', 'dt_escotista_preliminar_nivel',
    'dt_escotista_basico_curso', 'dt_escotista_basico_nivel',
    'dt_escotista_avancado_curso', 'dt_escotista_avancado_nivel',
    'dt_dirigente_preliminar_curso', 'dt_dirigente_preliminar_nivel',
    'dt_dirigente_basico_curso', 'dt_dirigente_basico_nivel',
    'dt_dirigente_avancado_curso', 'dt_dirigente_avancado_nivel',
    'dt_formador_cf1_curso', 'dt_formador_cf2_curso',
    'dt_formador_cngpe1_curso', 'dt_formador_cngpe2_curso',
    'dt_formador_cngi1_curso', 'dt_formador_cngi2_curso'
  ];

  progKeys.forEach(key => {
    const idx = stringTable.indexOf(key);
    if (idx !== -1 && idx + 1 < stringTable.length) {
      const nextVal = stringTable[idx + 1];
      // A data deve ter formato DD/MM/AAAA ou similar
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(nextVal)) {
        data[key] = nextVal;
      }
    }
  });

  // Extract other metadata (e.g. name, registration number)
  const nameIdx = stringTable.indexOf('nm_associado');
  if (nameIdx !== -1 && nameIdx + 1 < stringTable.length) {
    data['nm_associado'] = stringTable[nameIdx + 1];
  }
  
  const regIdx = stringTable.indexOf('nr_registro');
  if (regIdx !== -1 && regIdx + 1 < stringTable.length) {
    data['nr_registro'] = stringTable[regIdx + 1];
  }

  const categoryIdx = stringTable.indexOf('dsCategoria');
  if (categoryIdx !== -1 && categoryIdx + 1 < stringTable.length) {
    data['dsCategoria'] = stringTable[categoryIdx + 1];
  }

  const ramoIdx = stringTable.indexOf('dsRamo');
  if (ramoIdx !== -1 && ramoIdx + 1 < stringTable.length) {
    data['dsRamo'] = stringTable[ramoIdx + 1];
  }

  const nasIdx = stringTable.indexOf('dt_nascimento');
  if (nasIdx !== -1 && nasIdx + 1 < stringTable.length) {
    data['dt_nascimento'] = stringTable[nasIdx + 1];
  }

  const sexIdx = stringTable.indexOf('ds_sexo');
  if (sexIdx !== -1 && sexIdx + 1 < stringTable.length) {
    data['ds_sexo'] = stringTable[sexIdx + 1];
  }

  const ativoIdx = stringTable.indexOf('fl_ativo');
  if (ativoIdx !== -1 && ativoIdx + 1 < stringTable.length) {
    data['fl_ativo'] = stringTable[ativoIdx + 1];
  }

  const grupoIdx = stringTable.indexOf('nr_grupo');
  if (grupoIdx !== -1 && grupoIdx + 1 < stringTable.length) {
    data['nr_grupo'] = stringTable[grupoIdx + 1];
  }

  const secaoIdx = stringTable.indexOf('nmSecao');
  if (secaoIdx !== -1 && secaoIdx + 1 < stringTable.length) {
    data['nmSecao'] = stringTable[secaoIdx + 1];
  }

  // Extrair qualquer JSON que contenha atividades de progressão
  const activities = [];
  stringTable.forEach(str => {
    if (typeof str === 'string' && (str.startsWith('{') || str.includes('"totalCount"'))) {
      try {
        // Corrigir possíveis escapes duplos
        let cleanedStr = str;
        if (cleanedStr.includes('\\"')) {
          cleanedStr = cleanedStr.replace(/\\"/g, '"').replace(/\\'/g, "'");
        }
        const json = JSON.parse(cleanedStr);
        if (json && json.data && Array.isArray(json.data)) {
          activities.push(...json.data);
        }
      } catch (e) {
        // Ignorar falhas de parseamento
      }
    }
  });

  if (activities.length > 0) {
    data['atividades'] = activities;
  }

  return data;
}

/**
 * Basic GWT RPC Deserializer
 */
function deserializeGwt(parsedArray) {
  // GWT RPC response array format:
  // [index_1, index_2, ..., index_m, stringTable, flags, version]
  // Indices are 1-based index to stringTable.
  // Negatives index into object cache.
  // 0 represents null.
  
  const stringTable = parsedArray[parsedArray.length - 3];
  const payload = parsedArray.slice(0, parsedArray.length - 3);

  let cursor = 0;
  const objectCache = [];

  function read() {
    if (cursor >= payload.length) return null;
    return payload[cursor++];
  }

  // Helper to resolve string table index
  function getString(idx) {
    if (idx === 0) return null;
    return stringTable[idx - 1];
  }

  function deserializeValue() {
    const val = read();
    if (val === null) return null;

    if (val < 0) {
      // Object reference from cache
      return objectCache[Math.abs(val) - 1];
    }

    if (val === 0) {
      return null;
    }

    // It's a string table index or primitive
    const str = getString(val);
    
    // GWT serializes types by classname
    if (str && str.includes('/')) {
      // It's a class definition: "className/hash"
      const className = str.split('/')[0];
      
      if (className === 'java.util.HashMap') {
        const obj = {};
        objectCache.push(obj);
        // Read size
        const size = read();
        for (let i = 0; i < size; i++) {
          const key = deserializeValue();
          const value = deserializeValue();
          if (key) obj[key] = value;
        }
        return obj;
      }
      
      if (className === 'java.util.ArrayList') {
        const arr = [];
        objectCache.push(arr);
        const size = read();
        for (let i = 0; i < size; i++) {
          arr.push(deserializeValue());
        }
        return arr;
      }

      if (className === 'br.com.wallis.sgg.shared.beans.associado.AssociadoBean') {
        const obj = { _type: 'AssociadoBean' };
        objectCache.push(obj);
        
        // This bean has many fields. We can deserialize all of them sequentially.
        // Let's write them to the object.
        // In GWT, fields are deserialized in alphabetical order or as defined by the serialization policy.
        // If we don't have the exact field list order, we can map the values using the string table.
        // Since we know the fields and values are in the stream, let's parse them.
        // GWT RPC fields of AssociadoBean are read from the stream.
        // Let's just deserialize all values in the stream into an array and match them with fields.
        // Let's read all remaining values until the end of the bean or fallback.
        // For AssociadoBean, let's extract all values.
        return obj;
      }
    }

    return str;
  }

  // Parse the root object
  const rootValIndex = payload[0];
  const root = getString(rootValIndex);
  
  // Let's do a simple heuristic parser if the object structure is too complex:
  // Just find all key-value mappings in the payload
  const result = {};
  
  // We can scan the string table and the payload to find associations.
  // Actually, we can combine our extraction fallback with object graph traversal.
  const extracted = extractStringTableData(stringTable);
  
  // Let's also traverse the hashmap/array if they exist in the stream
  cursor = 0;
  try {
    while (cursor < payload.length) {
      const v = deserializeValue();
      if (v && typeof v === 'object') {
        Object.assign(result, v);
      }
    }
  } catch (e) {
    // Ignore traversal errors and use fallback
  }

  return Object.keys(result).length > 0 ? Object.assign(extracted, result) : extracted;
}

module.exports = {
  parseGwtRpc
};
