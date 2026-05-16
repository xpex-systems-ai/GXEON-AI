/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎨 GXEON PREDATOR — Gerador de Ícones
 * Cria ícones PNG em todos os tamanhos necessários
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * USO:
 *   node extension/scripts/generate-icons.js
 * 
 * REQUER:
 *   npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Tentar usar sharp, ou criar placeholders simples
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.log('⚠️ Sharp não instalado. Instale com: npm install sharp');
    console.log('   Criando placeholders temporários...\n');
}

const ICONS_DIR = path.join(__dirname, '..', 'icons');

const SIZES = [
    { size: 16, name: 'icon16.png' },
    { size: 32, name: 'icon32.png' },
    { size: 48, name: 'icon48.png' },
    { size: 128, name: 'icon128.png' }
];

// Cores GXEON
const COLORS = {
    gold: '#D4AF37',
    background: '#0a0e27',
    cyan: '#00FFFF'
};

// SVG do ícone (leão estilizado simples)
const generateSVG = (size) => {
    const scale = size / 128;
    const center = size / 2;
    
    return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="${COLORS.background}" rx="${size * 0.15}"/>
  
  <!-- Outer ring -->
  <circle cx="${center}" cy="${center}" r="${size * 0.4}" 
          fill="none" stroke="${COLORS.gold}" stroke-width="${size * 0.03}"/>
  
  <!-- Inner decorative circle -->
  <circle cx="${center}" cy="${center}" r="${size * 0.3}" 
          fill="none" stroke="${COLORS.cyan}" stroke-width="${size * 0.015}" 
          stroke-dasharray="${size * 0.1} ${size * 0.05}"/>
  
  <!-- Central 'G' letter -->
  <text x="${center}" y="${center + size * 0.05}" 
        font-family="Courier New, monospace" 
        font-size="${size * 0.5}" 
        font-weight="bold" 
        fill="${COLORS.gold}" 
        text-anchor="middle" 
        dominant-baseline="middle">G</text>
  
  <!-- Eye dot (predator vision) -->
  <circle cx="${center + size * 0.12}" cy="${center - size * 0.08}" r="${size * 0.04}" fill="${COLORS.cyan}"/>
  
  <!-- Decorative corners -->
  <path d="M ${size * 0.15} ${size * 0.25} L ${size * 0.25} ${size * 0.25} L ${size * 0.25} ${size * 0.15}" 
        fill="none" stroke="${COLORS.gold}" stroke-width="${size * 0.02}" stroke-linecap="round"/>
  <path d="M ${size * 0.85} ${size * 0.25} L ${size * 0.75} ${size * 0.25} L ${size * 0.75} ${size * 0.15}" 
        fill="none" stroke="${COLORS.gold}" stroke-width="${size * 0.02}" stroke-linecap="round"/>
  <path d="M ${size * 0.15} ${size * 0.75} L ${size * 0.25} ${size * 0.75} L ${size * 0.25} ${size * 0.85}" 
        fill="none" stroke="${COLORS.gold}" stroke-width="${size * 0.02}" stroke-linecap="round"/>
  <path d="M ${size * 0.85} ${size * 0.75} L ${size * 0.75} ${size * 0.75} L ${size * 0.75} ${size * 0.85}" 
        fill="none" stroke="${COLORS.gold}" stroke-width="${size * 0.02}" stroke-linecap="round"/>
</svg>
    `.trim();
};

// Criar ícone usando Sharp
async function createIconWithSharp(size, name) {
    const svg = generateSVG(size);
    const outputPath = path.join(ICONS_DIR, name);
    
    await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);
    
    return outputPath;
}

// Criar placeholder SVG
function createPlaceholderSVG(size, name) {
    const svg = generateSVG(size);
    const outputPath = path.join(ICONS_DIR, name.replace('.png', '.svg'));
    
    fs.writeFileSync(outputPath, svg);
    return outputPath;
}

// Main
async function main() {
    console.log('🎨 [GXEON-ICONS] Gerando ícones PREDATOR v21.2...\n');
    
    // Criar pasta icons se não existir
    if (!fs.existsSync(ICONS_DIR)) {
        fs.mkdirSync(ICONS_DIR, { recursive: true });
    }
    
    for (const { size, name } of SIZES) {
        try {
            if (sharp) {
                const filePath = await createIconWithSharp(size, name);
                console.log(`✅ ${name} (${size}x${size}) → ${filePath}`);
            } else {
                const filePath = createPlaceholderSVG(size, name);
                console.log(`✅ ${name.replace('.png', '.svg')} (${size}x${size}) → ${filePath}`);
                console.log('   ⚠️  Execute: npm install sharp && node extension/scripts/generate-icons.js');
            }
        } catch (err) {
            console.error(`❌ Erro ao criar ${name}:`, err.message);
        }
    }
    
    console.log('\n🦁 [GXEON-ICONS] Ícones gerados com sucesso!');
    console.log('   Local: extension/icons/');
    
    if (!sharp) {
        console.log('\n📦 Para converter SVG → PNG (requerido pelo Chrome/Brave):');
        console.log('   1. npm install sharp');
        console.log('   2. node extension/scripts/generate-icons.js');
    }
}

main().catch(console.error);
