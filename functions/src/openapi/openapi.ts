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
  apis: ['lib/**/*.js'],
};
// Find the project root
const projectRoot = findProjectRoot(__dirname, 'package.json');
if (!projectRoot) {
  console.error(
    `Failed to find project root while searching for 'package.json'.\n` +
      `Current working directory: ${process.cwd()}\n` +
      `Script directory (__dirname): ${__dirname}\n` +
      `\n` +
      `This script must be run from the project root (or package.json must exist in a parent directory).\n` +
      `Next steps:\n` +
      `  1. Verify that package.json exists at the project root\n` +
      `  2. Run this script from the project root directory\n` +
      `  3. If needed, update the marker file name or provide an alternate root path`
  );
  process.exit(1);
}
const openapiSpecification = swaggerJsdoc(swaggerOptions);
// Define the output paths relative to the dynamically found project root
const outputPath = path.join(projectRoot, 'openapi/openapi.json');
const outputDir = path.dirname(outputPath); // This will be projectRoot/openapi
// Ensure the output directory exists
try {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
} catch (error) {
  console.error('Error ensuring OpenAPI output directory:', error);
  process.exit(1);
}
// Write the specification to the JSON file used by Scalar
try {
  fs.writeFileSync(outputPath, JSON.stringify(openapiSpecification, null, 2));
  console.log(`OpenAPI specification created successfully at ${outputPath}`);
} catch (error) {
  console.error('Error writing OpenAPI specification:', error);
  process.exit(1);
}
