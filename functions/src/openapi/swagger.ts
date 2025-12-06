import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Helper function to find the project root by looking for a marker file
function findProjectRoot(startDir: string, markerFile: string): string | null {
  let currentDir = startDir;
  while (true) {
    if (fs.existsSync(path.join(currentDir, markerFile))) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}
const projectRoot = findProjectRoot(__dirname, 'LICENSE.md');
if (!projectRoot) {
  const searchedDirs = [__dirname];
  let currentDir = __dirname;
  while (true) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    searchedDirs.push(parentDir);
    currentDir = parentDir;
  }
  throw new Error(
    `Failed to find project root: 'LICENSE.md' not found in any parent directory.\n` +
    `Searched directories (from ${__dirname} upwards):\n` +
    searchedDirs.map(dir => `  - ${dir}`).join('\n') + '\n' +
    `Ensure LICENSE.md exists at the project root.`
  );
}
const sourceGlob = path.join(projectRoot, 'functions', 'src', '**', '*.ts');
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TarkovTracker API (Fork)',
      description: "Player's progress, objectives, level, reputation and more.",
      version: '2.0',
      contact: {
        name: 'TarkovTracker GitHub',
        url: 'https://github.com/tarkovtracker-org/TarkovTracker',
      },
      license: {
        name: 'GNU General Public License v3.0',
        url: 'https://www.gnu.org/licenses/gpl-3.0.en.html',
      },
    },
    servers: [
      {
        url: 'https://tarkovtracker.org/api/v2',
        description: 'TarkovTracker API v2 production endpoint',
      },
      {
        url: 'https://staging--tarkovtracker-org.web.app/api/v2',
        description: 'TarkovTracker API v2 staging preview channel',
      },
    ],
    tags: [
      {
        name: 'Token',
        description: 'Operations related to API tokens',
      },
      {
        name: 'Progress',
        description: 'Operations related to player and team progress',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [sourceGlob],
};
const openapiSpecification = swaggerJsdoc(swaggerOptions);
// Define the output paths relative to the dynamically found project root
const outputPath = path.join(projectRoot, 'docs/openapi.json');
const jsOutputPath = path.join(projectRoot, 'docs/openapi.js');
const outputDir = path.dirname(outputPath); // This will be projectRoot/docs
// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
// Write the specification to a JSON file
fs.writeFile(outputPath, JSON.stringify(openapiSpecification, null, 2), (err) => {
  if (err) {
    console.error('Error writing OpenAPI specification:', err);
    process.exit(1);
  } else {
    console.log(`OpenAPI specification created successfully at ${outputPath}`);
    const jsContent = `window.openapi = ${JSON.stringify(openapiSpecification, null, 2)};`;
    fs.writeFile(jsOutputPath, jsContent, (err) => {
      if (err) {
        console.error('Error writing OpenAPI JS file:', err);
        process.exit(1);
      } else {
        console.log(`OpenAPI JS file created successfully at ${jsOutputPath}`);
      }
    });
  }
});
