#!/usr/bin/env node
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';

const THEMES = [
  'cloudflare', 'vercel', 'supabase', 'tailwind', 'openai', 'mintlify', 
  'prisma', 'clerk', 'elevenlabs', 'resend', 'triggerdev', 'nuxt', 
  'browserbase', 'gemini', 'stripe', 'noir', 'mono', 'breeze', 'candy',
  'crimson', 'falcon', 'meadow', 'midnight', 'raindrop', 'sunset',
  'bitmap', 'ice', 'sand', 'forest'
];

const LANGUAGES = [
  'typescript', 'javascript', 'python', 'swift', 'go', 'rust', 'java',
  'kotlin', 'cpp', 'c', 'csharp', 'ruby', 'php', 'shell', 'sql', 'json',
  'yaml', 'html', 'css', 'markdown', 'plaintext'
];

function printHelp() {
  console.log(`
rayshot - Generate beautiful code screenshots from ray.so

USAGE:
  rayshot <code-or-file> [options]

ARGUMENTS:
  <code-or-file>    Code string or path to a file

OPTIONS:
  -t, --theme       Theme name (default: cloudflare)
  -l, --language    Language for syntax highlighting (default: typescript)
  -o, --output      Output file path (default: ./rayshot.png)
  -n, --name        Filename shown in header (default: none)
  -p, --padding     Padding in pixels (default: 32)
  -d, --dark        Dark mode (default: true)
  --light           Light mode
  --list-themes     List available themes
  --list-languages  List available languages
  -h, --help        Show this help

EXAMPLES:
  rayshot "const x = 1;" -o screenshot.png
  rayshot ./snippet.ts --theme vercel --name utils.ts
  rayshot "console.log('hi')" -t supabase -l javascript
  cat file.py | rayshot - --language python

THEMES:
  ${THEMES.slice(0, 10).join(', ')}...
  Use --list-themes for full list
`);
}

function parseArgs(args) {
  const options = {
    code: null,
    theme: 'cloudflare',
    language: 'typescript', 
    output: './rayshot.png',
    title: '',
    padding: 32,
    darkMode: true
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    } else if (arg === '--list-themes') {
      console.log('Available themes:\n  ' + THEMES.join('\n  '));
      process.exit(0);
    } else if (arg === '--list-languages') {
      console.log('Available languages:\n  ' + LANGUAGES.join('\n  '));
      process.exit(0);
    } else if (arg === '-t' || arg === '--theme') {
      options.theme = args[++i];
    } else if (arg === '-l' || arg === '--language') {
      options.language = args[++i];
    } else if (arg === '-o' || arg === '--output') {
      options.output = args[++i];
    } else if (arg === '-n' || arg === '--name') {
      options.title = args[++i];
    } else if (arg === '-p' || arg === '--padding') {
      options.padding = parseInt(args[++i], 10);
    } else if (arg === '-d' || arg === '--dark') {
      options.darkMode = true;
    } else if (arg === '--light') {
      options.darkMode = false;
    } else if (arg === '-') {
      // Read from stdin
      options.code = readFileSync(0, 'utf-8');
    } else if (!arg.startsWith('-') && !options.code) {
      // Check if it's a file or code string
      if (existsSync(arg)) {
        options.code = readFileSync(arg, 'utf-8');
        if (!options.title) {
          options.title = basename(arg);
        }
      } else {
        options.code = arg;
      }
    }
    i++;
  }

  return options;
}

async function generateScreenshot(options) {
  const { code, theme, language, output, title, padding, darkMode } = options;

  if (!code) {
    console.error('Error: No code provided');
    printHelp();
    process.exit(1);
  }

  // Build URL
  const encoded = Buffer.from(code).toString('base64');
  const params = new URLSearchParams({
    theme,
    darkMode: String(darkMode),
    padding: String(padding),
    language,
    ...(title && { title })
  });
  params.set('code', encoded);
  
  const url = `https://ray.so/#${params.toString()}`;

  console.log(`Theme: ${theme}`);
  console.log(`Language: ${language}`);
  console.log(`Output: ${resolve(output)}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#frame', { timeout: 10000 });
  await page.waitForTimeout(1000);
  
  const exportButton = await page.locator('button:has-text("Export")').first();
  
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportButton.click()
  ]);
  
  const outputPath = resolve(output);
  await download.saveAs(outputPath);
  
  await browser.close();
  
  console.log(`✓ Saved to ${outputPath}`);
  return outputPath;
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  printHelp();
  process.exit(0);
}

const options = parseArgs(args);
generateScreenshot(options).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
