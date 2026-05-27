const fs = require('fs-extra');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

const distDir = path.join(__dirname, 'dist');

const jsFiles = [
    'growth-data.js',
    'attachment-data.js',
    'clinical-core.js',
    'database-gizi.js',
    'who-charting.js',
    'cdc-charting.js',
    'official-charts-calibration.js',
    'charting.js',
    'parser.js',
    'ui.js'
];

const cssFiles = [
    'styles.css'
];

const staticDirs = [
    'assets',
    'cdc',
    'who',
    'sources'
];

async function build() {
    console.log('🚀 Starting Build Process...');
    
    // 1. Clean dist directory
    await fs.emptyDir(distDir);
    console.log('✅ Cleaned dist directory.');

    // 2. Concatenate and Minify JS
    let combinedJs = '';
    for (const file of jsFiles) {
        combinedJs += fs.readFileSync(path.join(__dirname, file), 'utf8') + '\n;\n';
    }
    console.log(`📦 Concatenated ${jsFiles.length} JS files.`);
    
    const minifiedJs = await minify(combinedJs, { 
        mangle: true, 
        compress: {
            drop_console: false, // Keep console logs just in case they are useful for debugging
            passes: 2
        } 
    });
    const jsOutputPath = path.join(distDir, 'app.bundle.min.js');
    await fs.writeFile(jsOutputPath, minifiedJs.code);
    console.log(`✅ Minified JS written to ${jsOutputPath} (${(minifiedJs.code.length / 1024).toFixed(2)} KB).`);

    // 3. Concatenate and Minify CSS
    let combinedCss = '';
    for (const file of cssFiles) {
        combinedCss += fs.readFileSync(path.join(__dirname, file), 'utf8') + '\n';
    }
    console.log(`📦 Concatenated ${cssFiles.length} CSS files.`);
    
    const minifiedCss = new CleanCSS({}).minify(combinedCss);
    const cssOutputPath = path.join(distDir, 'styles.min.css');
    await fs.writeFile(cssOutputPath, minifiedCss.styles);
    console.log(`✅ Minified CSS written to ${cssOutputPath} (${(minifiedCss.styles.length / 1024).toFixed(2)} KB).`);

    // 4. Rewrite HTML
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // Remove all original script tags from the html
    for (const file of jsFiles) {
        const regex = new RegExp(`<script src="${file.replace('.', '\\.')}(\\?v=[0-9\\.]+)?"><\\/script>\\s*`, 'g');
        html = html.replace(regex, '');
    }
    // Remove all original css link tags
    for (const file of cssFiles) {
        const regex = new RegExp(`<link rel="stylesheet" href="${file.replace('.', '\\.')}(\\?v=[0-9\\.]+)?">\\s*`, 'g');
        html = html.replace(regex, '');
    }

    // Insert new tags before </head> or </body>
    const newCssTag = `<link rel="stylesheet" href="styles.min.css?v=${Date.now()}">\n`;
    html = html.replace('</head>', `${newCssTag}</head>`);

    const newJsTag = `<script src="app.bundle.min.js?v=${Date.now()}"></script>\n`;
    // Insert just before closing body tag
    html = html.replace('</body>', `${newJsTag}</body>`);

    await fs.writeFile(path.join(distDir, 'index.html'), html);
    console.log('✅ index.html rewritten for production.');

    // 5. Copy Static Assets
    for (const dir of staticDirs) {
        const srcPath = path.join(__dirname, dir);
        if (await fs.pathExists(srcPath)) {
            await fs.copy(srcPath, path.join(distDir, dir));
            console.log(`📁 Copied static directory: ${dir}`);
        }
    }

    console.log('🎉 Build completed successfully! The /dist folder is ready for deployment.');
}

build().catch(err => {
    console.error('❌ Build failed:', err);
    process.exit(1);
});
