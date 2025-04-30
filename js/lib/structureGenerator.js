/**
 * StructureGenerator - Módulo para geração de estruturas complexas
 * Usando sistemas baseados em IA para criar estruturas mais naturais e interessantes
 */




function StructureGenerator() {
    this.templateStructures = {
        // Configurações de templates para cavernas
        "cave": {
            minSize: 5,
            maxSize: 30,
            roughness: 0.5,
            items: [
                ITEMS.GRAVEL_TILE_ID,
                ITEMS.STONE_TILE_ID
            ]
        },
        // Configurações de templates para ruínas
        "ruins": {
            minSize: 3,
            maxSize: 10,
            patterns: [
                [[1,1,1], [1,0,1], [1,1,1]], // Sala
                [[1,1,1,1,1], [1,0,0,0,1], [1,1,1,1,1]], // Sala mais larga
                [[1,1,1], [1,0,1]], // L invertido
                [[1,1], [1,0], [1,1]] // L
            ],
            items: [
                ITEMS.STONE_TILE_ID,
                ITEMS.GRAVEL_TILE_ID
            ]
        },
        // Configurações para lagos
        "lake": {
            minSize: 10,
            maxSize: 40,
            roughness: 0.3,
            items: [
                ITEMS.WATER_TILE_ID
            ]
        },
        // Configurações para florestas
        "forest": {
            density: 0.4,
            clustering: 0.7,
            minSize: 20,
            maxSize: 100
        }
    };
}

/**
 * Gera cavernas usando autômatos celulares para criar formas mais naturais
 */
StructureGenerator.prototype.generateCave = function(width, height, baseLayer, config, noise) {
    const caveMap = this.initializeCaveMap(width, height, config.frequency || 0.45);
    let resultMap = Array.from(baseLayer); // Copiar o mapa base
    
    // Número de iterações do autômato celular
    const iterations = config.iterations || 5;
    
    // Aplicar autômato celular para criar formas naturais de caverna
    for (let i = 0; i < iterations; i++) {
        this.applyAutomatonIteration(caveMap, width, height);
    }
    
    // Identificar cavernas separadas
    const caverns = this.identifyCaverns(caveMap, width, height);
    
    // Filtrar cavernas muito pequenas
    const validCaverns = caverns.filter(cavern => 
        cavern.length >= this.templateStructures.cave.minSize &&
        cavern.length <= this.templateStructures.cave.maxSize
    );
    
    // Aplicar as cavernas ao mapa
    validCaverns.forEach(cavern => {
        cavern.forEach(point => {
            const idx = point.y * width + point.x;
            if (baseLayer[idx] === ITEMS.MOUNTAIN_TILE_ID) {
                resultMap[idx] = ITEMS.GRAVEL_TILE_ID;
                
                // Ocasionalmente adicionar pedras ao redor para mais detalhe
                if (Math.random() < 0.2) {
                    this.addSurroundingDetail(resultMap, width, height, point.x, point.y);
                }
            }
        });
        
        // Conectar cavernas próximas para criar túneis
        this.connectNearbyCaverns(resultMap, width, height, cavern, validCaverns);
    });
    
    return resultMap;
};

/**
 * Inicializa o mapa de cavernas com ruído para maior naturalidade
 */
StructureGenerator.prototype.initializeCaveMap = function(width, height, frequency) {
    const caveMap = Array(width * height).fill(false);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Usar ruído perlin seria ideal aqui, mas usaremos Math.random para simplificar
            caveMap[y * width + x] = Math.random() < frequency;
        }
    }
    
    return caveMap;
};

/**
 * Aplica uma iteração do autômato celular para gerar a forma da caverna
 */
StructureGenerator.prototype.applyAutomatonIteration = function(caveMap, width, height) {
    const newMap = Array.from(caveMap);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const neighbors = this.countNeighbors(caveMap, x, y, width, height);
            
            // Regras do autômato celular para gerar cavernas
            // Se um ponto tem muitos vizinhos preenchidos, ele é preenchido
            // Se um ponto tem poucos vizinhos preenchidos, ele é esvaziado
            if (caveMap[idx]) {
                newMap[idx] = neighbors >= 4; // Manter preenchido apenas se tiver vizinhos suficientes
            } else {
                newMap[idx] = neighbors >= 5; // Preencher se tiver muitos vizinhos
            }
        }
    }
    
    // Copiar o novo mapa para o mapa original
    for (let i = 0; i < caveMap.length; i++) {
        caveMap[i] = newMap[i];
    }
};

/**
 * Conta quantos vizinhos de um ponto estão preenchidos
 */
StructureGenerator.prototype.countNeighbors = function(map, x, y, width, height) {
    let count = 0;
    
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            
            // Se fora dos limites, contar como preenchido (isso faz com que as bordas sejam mais sólidas)
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                count++;
            } else if (map[ny * width + nx]) {
                count++;
            }
        }
    }
    
    return count;
};

/**
 * Identifica cavernas separadas usando busca em largura
 */
StructureGenerator.prototype.identifyCaverns = function(caveMap, width, height) {
    const visited = Array(width * height).fill(false);
    const caverns = [];
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            if (caveMap[idx] && !visited[idx]) {
                // Encontramos uma nova caverna
                const cavern = [];
                const queue = [{x, y}];
                visited[idx] = true;
                
                // BFS para encontrar pontos conectados
                while (queue.length > 0) {
                    const point = queue.shift();
                    cavern.push(point);
                    
                    // Verificar vizinhos
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            
                            const nx = point.x + dx;
                            const ny = point.y + dy;
                            
                            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                            
                            const nIdx = ny * width + nx;
                            
                            if (caveMap[nIdx] && !visited[nIdx]) {
                                queue.push({x: nx, y: ny});
                                visited[nIdx] = true;
                            }
                        }
                    }
                }
                
                caverns.push(cavern);
            }
        }
    }
    
    return caverns;
};

/**
 * Adiciona detalhes ao redor de um ponto para mais realismo
 */
StructureGenerator.prototype.addSurroundingDetail = function(map, width, height, x, y) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            
            const idx = ny * width + nx;
            
            // Adicionar pedras ao redor com probabilidade
            if (map[idx] === ITEMS.MOUNTAIN_TILE_ID && Math.random() < 0.3) {
                map[idx] = ITEMS.STONE_TILE_ID;
            }
        }
    }
};

/**
 * Conecta cavernas próximas para criar sistemas de cavernas
 */
StructureGenerator.prototype.connectNearbyCaverns = function(map, width, height, sourceCavern, allCaverns) {
    // Encontrar o centro da caverna fonte
    const sourceCenter = this.findCavernCenter(sourceCavern);
    
    // Procurar cavernas próximas para conectar
    for (const targetCavern of allCaverns) {
        // Não conectar a si mesmo
        if (targetCavern === sourceCavern) continue;
        
        const targetCenter = this.findCavernCenter(targetCavern);
        const distance = Math.sqrt(
            Math.pow(targetCenter.x - sourceCenter.x, 2) + 
            Math.pow(targetCenter.y - sourceCenter.y, 2)
        );
        
        // Conectar apenas cavernas próximas o suficiente
        if (distance < 30 && Math.random() < 0.3) {
            this.createTunnel(map, width, height, sourceCenter, targetCenter);
        }
    }
};

/**
 * Encontra o centro aproximado de uma caverna
 */
StructureGenerator.prototype.findCavernCenter = function(cavern) {
    let sumX = 0, sumY = 0;
    
    for (const point of cavern) {
        sumX += point.x;
        sumY += point.y;
    }
    
    return {
        x: Math.floor(sumX / cavern.length),
        y: Math.floor(sumY / cavern.length)
    };
};

/**
 * Cria um túnel entre dois pontos
 */
StructureGenerator.prototype.createTunnel = function(map, width, height, from, to) {
    // Algoritmo de Bresenham para traçar uma linha
    let x0 = from.x, y0 = from.y;
    const x1 = to.x, y1 = to.y;
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;
    
    while (true) {
        // Definir ponto como túnel
        const idx = y0 * width + x0;
        if (idx >= 0 && idx < map.length) {
            map[idx] = ITEMS.GRAVEL_TILE_ID;
            
            // Adicionar largura ao túnel
            for (let oy = -1; oy <= 1; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    const nx = x0 + ox;
                    const ny = y0 + oy;
                    
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                    
                    const nIdx = ny * width + nx;
                    
                    // Apenas mudar montanhas para gravel, preservar outros tiles
                    if (map[nIdx] === ITEMS.MOUNTAIN_TILE_ID) {
                        map[nIdx] = ITEMS.GRAVEL_TILE_ID;
                    }
                }
            }
        }
        
        // Chegamos ao destino?
        if (x0 === x1 && y0 === y1) break;
        
        // Calcular próximo ponto
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
};

/**
 * Gera estruturas de ruínas usando templates e variações
 */
StructureGenerator.prototype.generateRuins = function(width, height, baseLayer, config) {
    let resultMap = Array.from(baseLayer); // Copiar o mapa base
    const template = this.templateStructures.ruins;
    
    // Número de estruturas a tentar colocar
    const numStructures = config.count || Math.floor(Math.sqrt(width * height) / 16);
    
    for (let i = 0; i < numStructures; i++) {
        // Escolher um padrão aleatório
        const pattern = template.patterns[Math.floor(Math.random() * template.patterns.length)];
        
        // Dimensões do padrão
        const patternHeight = pattern.length;
        const patternWidth = pattern[0].length;
        
        // Escolher uma posição aleatória
        const startX = Math.floor(Math.random() * (width - patternWidth - 10)) + 5;
        const startY = Math.floor(Math.random() * (height - patternHeight - 10)) + 5;
        
        // Verificar se a área é adequada (principalmente grama)
        let suitable = true;
        let grassCount = 0;
        
        for (let y = 0; y < patternHeight; y++) {
            for (let x = 0; x < patternWidth; x++) {
                const idx = (startY + y) * width + (startX + x);
                
                if (baseLayer[idx] === ITEMS.GRASS_TILE_ID) {
                    grassCount++;
                }
                
                // Não colocar em água ou montanhas
                if (baseLayer[idx] === ITEMS.WATER_TILE_ID || 
                    baseLayer[idx] === ITEMS.MOUNTAIN_TILE_ID) {
                    suitable = false;
                    break;
                }
            }
            if (!suitable) break;
        }
        
        // Verificar se pelo menos 60% é grama
        suitable = suitable && (grassCount / (patternWidth * patternHeight) > 0.6);
        
        if (suitable) {
            // Aplicar o padrão
            for (let y = 0; y < patternHeight; y++) {
                for (let x = 0; x < patternWidth; x++) {
                    if (pattern[y][x] === 1) {
                        const idx = (startY + y) * width + (startX + x);
                        resultMap[idx] = template.items[0]; // Usar pedra para paredes
                        
                        // Adicionar alguns detalhes para fazer parecer ruínas
                        if (Math.random() < 0.3) {
                            resultMap[idx] = template.items[1]; // Usar cascalho para desgaste
                        }
                    }
                }
            }
            
            // Adicionar "destruição" ao redor para parecer ruínas antigas
            for (let y = -1; y <= patternHeight; y++) {
                for (let x = -1; x <= patternWidth; x++) {
                    // Apenas nas bordas
                    if ((y === -1 || y === patternHeight || x === -1 || x === patternWidth) && 
                        Math.random() < 0.2) {
                        
                        const nx = startX + x;
                        const ny = startY + y;
                        
                        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                        
                        const idx = ny * width + nx;
                        
                        if (baseLayer[idx] === ITEMS.GRASS_TILE_ID) {
                            resultMap[idx] = template.items[1]; // Cascalho nas bordas
                        }
                    }
                }
            }
        }
    }
    
    return resultMap;
};

/**
 * Gera florestas usando um sistema baseado em clustering
 */
StructureGenerator.prototype.generateForest = function(width, height, baseLayer, clutter, config) {
    const forestMap = new Array(width * height).fill(null);
    const template = this.templateStructures.forest;
    const density = config.density || template.density;
    const clustering = config.clustering || template.clustering;
    
    // Primeiro passo: identificar áreas adequadas para florestas (principalmente grama)
    const suitableAreas = [];
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            if (baseLayer[idx] === ITEMS.GRASS_TILE_ID) {
                suitableAreas.push({x, y, idx});
            }
        }
    }
    
    // Segundo passo: plantar árvores "sementes"
    const numSeedTrees = Math.floor(suitableAreas.length * 0.01 * density);
    const seeds = [];
    
    for (let i = 0; i < numSeedTrees; i++) {
        if (suitableAreas.length === 0) break;
        
        // Escolher um ponto aleatório das áreas adequadas
        const index = Math.floor(Math.random() * suitableAreas.length);
        const point = suitableAreas[index];
        
        // Remover o ponto para que não seja selecionado novamente
        suitableAreas.splice(index, 1);
        
        // Plantar uma árvore semente
        forestMap[point.idx] = clutter.randomTree();
        seeds.push(point);
    }
    
    // Terceiro passo: criar clusters ao redor das árvores sementes
    for (const seed of seeds) {
        // Determinar o tamanho do cluster
        const clusterSize = Math.floor(
            Math.random() * (template.maxSize - template.minSize) + template.minSize
        );
        
        // Adicionar árvores em um padrão radial ao redor da semente
        for (let i = 0; i < clusterSize; i++) {
            // Distância baseada no tamanho do cluster (quanto maior, mais espalhado)
            const distance = Math.sqrt(clusterSize) * Math.random() * 1.5;
            const angle = Math.random() * Math.PI * 2;
            
            const nx = Math.floor(seed.x + Math.cos(angle) * distance);
            const ny = Math.floor(seed.y + Math.sin(angle) * distance);
            
            // Verificar limites
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            
            const idx = ny * width + nx;
            
            // Verificar se o local é adequado e ainda não tem árvore
            if (baseLayer[idx] === ITEMS.GRASS_TILE_ID && forestMap[idx] === null) {
                // Probabilidade baseada em clustering
                if (Math.random() < clustering) {
                    forestMap[idx] = clutter.randomTree();
                }
            }
        }
    }
    
    return forestMap;
};

/**
 * Gera lagos naturais usando formas orgânicas
 */
StructureGenerator.prototype.generateLake = function(width, height, baseLayer, config) {
    let resultMap = Array.from(baseLayer); // Copiar o mapa base
    const template = this.templateStructures.lake;
    
    // Número de lagos a tentar colocar
    const numLakes = config.count || Math.floor(Math.sqrt(width * height) / 32);
    
    for (let i = 0; i < numLakes; i++) {
        // Escolher um tamanho aleatório para o lago
        const lakeSize = Math.floor(
            Math.random() * (template.maxSize - template.minSize) + template.minSize
        );
        
        // Escolher um centro para o lago
        const centerX = Math.floor(Math.random() * (width - 20)) + 10;
        const centerY = Math.floor(Math.random() * (height - 20)) + 10;
        
        // Verificar se a área é adequada (principalmente grama, sem muita água por perto)
        let waterCount = 0;
        
        for (let y = centerY - 15; y <= centerY + 15; y++) {
            for (let x = centerX - 15; x <= centerX + 15; x++) {
                if (x < 0 || y < 0 || x >= width || y >= height) continue;
                
                const idx = y * width + x;
                
                if (baseLayer[idx] === ITEMS.WATER_TILE_ID) {
                    waterCount++;
                }
            }
        }
        
        // Se já há muita água por perto, pular
        if (waterCount > 10) continue;
        
        // Criar um lago com forma orgânica
        for (let y = centerY - lakeSize / 2; y <= centerY + lakeSize / 2; y++) {
            for (let x = centerX - lakeSize / 2; x <= centerX + lakeSize / 2; x++) {
                if (x < 0 || y < 0 || x >= width || y >= height) continue;
                
                // Calcular distância do centro
                const distance = Math.sqrt(
                    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                );
                
                // Adicionar ruído à distância para criar formas mais orgânicas
                const noiseOffset = (Math.random() - 0.5) * template.roughness * lakeSize;
                const adjustedDistance = distance + noiseOffset;
                
                // Se está dentro do raio do lago
                if (adjustedDistance < lakeSize / 2) {
                    const idx = y * width + x;
                    
                    // Não colocar lagos em montanhas ou água existente
                    if (baseLayer[idx] !== ITEMS.MOUNTAIN_TILE_ID &&
                        baseLayer[idx] !== ITEMS.WATER_TILE_ID) {
                        
                        // Profundidade da água baseada na distância do centro
                        const depthFactor = 1 - (adjustedDistance / (lakeSize / 2));
                        
                        // Lagos mais profundos no centro
                        resultMap[idx] = ITEMS.WATER_TILE_ID;
                        
                        // Adicionar borda de areia ao redor da água
                        if (depthFactor < 0.2 && Math.random() < 0.7) {
                            resultMap[idx] = ITEMS.SAND_TILE_ID;
                        }
                    }
                }
            }
        }
    }
    
    return resultMap;
};

// structureGenerator.js
window.OTMapGenIA = window.OTMapGenIA || {};

OTMapGenIA.StructureGenerator = (function() {
    // Todo o código de structureGenerator.js aqui, sem require
    
    // Funções públicas
    return {
        generateStructures: function() { /* ... */ },
        placeStructures: function() { /* ... */ }
    };
})();

// Remover a linha: module.exports = ...