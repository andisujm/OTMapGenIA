/**
 * BiomeAI - Módulo de IA para geração avançada de biomas
 * Inspirado por técnicas de Minecraft e outros geradores procedurais
 */

const ITEMS = require("../json/items");

// Sistema de classificação de biomas usando Voronoi e ruído de Perlin
function BiomeAI() {
    this.biomes = {
        OCEAN: {
            height: -0.5,
            moisture: 0.5,
            tileID: ITEMS.WATER_TILE_ID,
            decorations: []
        },
        BEACH: {
            height: -0.1,
            moisture: 0.3,
            tileID: ITEMS.SAND_TILE_ID,
            decorations: []
        },
        GRASSLAND: {
            height: 0.1,
            moisture: 0.4,
            tileID: ITEMS.GRASS_TILE_ID,
            decorations: []
        },
        FOREST: {
            height: 0.2,
            moisture: 0.6,
            tileID: ITEMS.GRASS_TILE_ID,
            decorations: ["trees", "shrubs"]
        },
        ROCKY: {
            height: 0.5,
            moisture: 0.3,
            tileID: ITEMS.GRAVEL_TILE_ID,
            decorations: ["rocks"]
        },
        MOUNTAIN: {
            height: 0.7,
            moisture: 0.2,
            tileID: ITEMS.MOUNTAIN_TILE_ID,
            decorations: []
        },
        SNOW: {
            height: 0.8,
            moisture: 0.4,
            tileID: ITEMS.SNOW_TILE_ID,
            decorations: []
        }
    };

    // Parâmetros configuráveis para a distribuição de biomas
    this.parameters = {
        moistureScale: 1.0,
        heightInfluence: 1.0,
        randomness: 0.2,
        biomeBlending: 0.15,
        riverChance: 0.03
    };
}

/**
 * Determina o bioma baseado na elevação e umidade usando um algoritmo de classificação
 */
BiomeAI.prototype.getBiomeAt = function(elevation, moisture, x, y, seed) {
    // Adicionar alguma variação para tornar as bordas irregulares
    const randomFactor = this.getRandomValue(x, y, seed) * this.parameters.randomness;
    const adjustedElevation = elevation + randomFactor * 0.1;
    const adjustedMoisture = moisture + randomFactor * 0.1;
    
    // Algoritmo de classificação Whittaker - um sistema realista de distribuição de biomas
    // baseado em umidade e elevação, semelhante ao usado em jogos modernos
    
    // Oceano (água)
    if (adjustedElevation < -0.2) {
        return this.biomes.OCEAN;
    }
    
    // Praia
    if (adjustedElevation < 0) {
        return this.biomes.BEACH;
    }

    // Terras altas - montanhas e neve
    if (adjustedElevation > 0.6) {
        if (adjustedMoisture > 0.3) {
            return this.biomes.SNOW;
        } else {
            return this.biomes.MOUNTAIN;
        }
    }
    
    // Terra média - rochosa
    if (adjustedElevation > 0.4) {
        return this.biomes.ROCKY;
    }
    
    // Terras baixas - gramado e floresta
    if (adjustedMoisture > 0.5) {
        return this.biomes.FOREST;
    } else {
        return this.biomes.GRASSLAND;
    }
};

/**
 * Gera rios baseados em fluxo natural de água usando um algoritmo de pathfinding
 */
BiomeAI.prototype.generateRivers = function(heightmap, width, height, seed) {
    const rivers = [];
    const visited = Array(width * height).fill(false);
    const riverPoints = [];
    
    // Número de rios baseado no tamanho do mapa
    const numRivers = Math.floor(Math.sqrt(width * height) / 32);
    
    for (let r = 0; r < numRivers; r++) {
        // Começar dos pontos altos (montanhas)
        let startPoints = [];
        for (let i = 0; i < width * height; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            
            // Borda de segurança
            if (x < 5 || y < 5 || x >= width-5 || y >= height-5) continue;
            
            // Pontos com elevação alta são bons lugares para iniciar rios
            if (heightmap[i] > 0.6 && !visited[i]) {
                startPoints.push({x, y, i});
            }
        }
        
        if (startPoints.length === 0) continue;
        
        // Escolher um ponto aleatório para iniciar o rio
        const startPoint = startPoints[Math.floor(this.getRandomValue(r, r+1, seed) * startPoints.length)];
        let currentPoint = startPoint;
        
        // Criar o rio até alcançar água ou borda do mapa
        const riverPath = [];
        let steps = 0;
        const maxSteps = width + height; // Evitar loops infinitos
        
        while (steps < maxSteps) {
            steps++;
            visited[currentPoint.i] = true;
            riverPath.push(currentPoint);
            
            // Procurar o vizinho com a menor altura
            let lowest = {height: heightmap[currentPoint.i], x: currentPoint.x, y: currentPoint.y, i: currentPoint.i};
            
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = currentPoint.x + dx;
                    const ny = currentPoint.y + dy;
                    
                    // Verificar limites
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                    
                    const ni = nx + ny * width;
                    
                    // Se já encontramos água, terminar o rio
                    if (heightmap[ni] < -0.1) {
                        riverPath.push({x: nx, y: ny, i: ni});
                        steps = maxSteps;
                        break;
                    }
                    
                    // Encontrar o ponto mais baixo para continuar o rio
                    if (heightmap[ni] < lowest.height && !visited[ni]) {
                        lowest = {height: heightmap[ni], x: nx, y: ny, i: ni};
                    }
                }
                
                if (steps >= maxSteps) break;
            }
            
            // Se não encontrarmos um ponto mais baixo, encerrar o rio
            if (lowest.i === currentPoint.i) break;
            
            currentPoint = lowest;
        }
        
        // Adicionar o rio se for grande o suficiente
        if (riverPath.length > 10) {
            rivers.push(riverPath);
            
            // Marcar os pontos do rio para distribuição de biomas
            riverPath.forEach(point => {
                riverPoints.push(point);
                // Modificar o heightmap para criar um vale do rio
                const ri = point.i;
                heightmap[ri] = -0.15; // Definir como água
                
                // Criar margens do rio
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const nx = point.x + dx;
                        const ny = point.y + dy;
                        
                        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                        
                        const ni = nx + ny * width;
                        
                        // Bordas do rio são mais baixas
                        if (heightmap[ni] > -0.1) {
                            heightmap[ni] = Math.min(heightmap[ni], -0.05 + Math.abs(dx * dy) * 0.1);
                        }
                    }
                }
            });
        }
    }
    
    return {rivers, riverPoints, modifiedHeightmap: heightmap};
};

/**
 * Função de utilidade para gerar valores determinísticos baseados em posição
 */
BiomeAI.prototype.getRandomValue = function(x, y, seed) {
    // Baseado no algoritmo xxHash
    const h = seed + x * 374761393 + y * 668265263;
    const h1 = (h ^ (h >>> 13)) * 1274126177;
    return ((h1 ^ (h1 >>> 16)) >>> 0) / 4294967296;
};

/**
 * Gera um mapa de temperaturas baseado em latitude e altura
 */
BiomeAI.prototype.generateTemperatureMap = function(width, height, heightmap) {
    const tempMap = new Array(width * height);
    
    for (let y = 0; y < height; y++) {
        // Temperatura baseada na latitude (distância do equador)
        const latitudeFactor = 1.0 - Math.abs((y / height) - 0.5) * 2;
        
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            
            // A temperatura diminui com a altura
            const heightFactor = Math.max(0, 1.0 - heightmap[i] * 2);
            
            // Combinar fatores para temperatura final
            tempMap[i] = latitudeFactor * 0.6 + heightFactor * 0.4;
        }
    }
    
    return tempMap;
};

/**
 * Gera um mapa de umidade combinando ruído com distância de corpos d'água
 */
BiomeAI.prototype.generateMoistureMap = function(width, height, heightmap, noise) {
    const moistureMap = new Array(width * height);
    const waterDistanceMap = this.calculateWaterDistance(width, height, heightmap);
    const maxDistance = Math.max(...waterDistanceMap);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            
            // Base de umidade do ruído de perlin
            const baseNoise = (noise.simplex2(x/64, y/64) + 1) * 0.5;
            
            // Quanto mais próximo da água, mais úmido
            const waterFactor = 1.0 - (waterDistanceMap[i] / maxDistance);
            
            // Combinação de fatores com alguns ajustes para tornar mais natural
            moistureMap[i] = baseNoise * 0.5 + waterFactor * 0.5;
        }
    }
    
    return moistureMap;
};

/**
 * Calcula a distância de cada ponto até a água mais próxima
 */
BiomeAI.prototype.calculateWaterDistance = function(width, height, heightmap) {
    const distanceMap = new Array(width * height).fill(Infinity);
    const queue = [];
    
    // Encontrar todos os pontos de água
    for (let i = 0; i < heightmap.length; i++) {
        if (heightmap[i] < -0.1) { // Água
            distanceMap[i] = 0;
            const x = i % width;
            const y = Math.floor(i / width);
            queue.push({x, y, dist: 0});
        }
    }
    
    // BFS para calcular distância
    while (queue.length > 0) {
        const current = queue.shift();
        
        // Verificar vizinhos
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                
                const nx = current.x + dx;
                const ny = current.y + dy;
                
                // Verificar limites
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                
                const ni = ny * width + nx;
                const newDist = current.dist + ((dx * dy !== 0) ? 1.414 : 1.0);
                
                if (newDist < distanceMap[ni]) {
                    distanceMap[ni] = newDist;
                    queue.push({x: nx, y: ny, dist: newDist});
                }
            }
        }
    }
    
    return distanceMap;
};

/**
 * Aplica os biomas com base nos mapas de altura, temperatura e umidade
 */
BiomeAI.prototype.applyBiomes = function(width, height, heightmap, temperatureMap, moistureMap, seed) {
    const biomeMap = new Array(width * height);
    
    for (let i = 0; i < width * height; i++) {
        const x = i % width;
        const y = Math.floor(i / width);
        
        const elevation = heightmap[i];
        const moisture = moistureMap[i];
        
        biomeMap[i] = this.getBiomeAt(elevation, moisture, x, y, seed);
    }
    
    return biomeMap;
};

/**
 * Distribui objetos e decorações conforme o bioma
 */
BiomeAI.prototype.distributeDecorations = function(width, height, biomeMap, clutter, seed) {
    const decorations = new Array(width * height).fill(null);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const biome = biomeMap[i];
            
            // Fator randômico para evitar padrões muito regulares
            const randomValue = this.getRandomValue(x, y, seed);
            
            // Distribuir decorações com base nas informações do bioma
            if (biome && biome.decorations) {
                if (biome.decorations.includes("trees") && randomValue < 0.05) {
                    decorations[i] = clutter.randomTree();
                } else if (biome.decorations.includes("rocks") && randomValue < 0.04) {
                    decorations[i] = clutter.randomSandstone();
                } else if (biome.tileID === ITEMS.SAND_TILE_ID && randomValue < 0.03) {
                    decorations[i] = clutter.randomShell();
                }
            }
        }
    }
    
    return decorations;
};

module.exports = new BiomeAI();