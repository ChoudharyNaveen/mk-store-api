/* eslint-disable filenames/match-exported */
const fs = require('fs');
const path = require('path');
const swaggerSpec = require('../config/swagger');

// Generate OpenAPI JSON file
const outputPath = path.join(__dirname, '..', 'openapi.json');

try {
  // Add /api prefix to all paths
  const pathsWithApiPrefix = {};

  if (swaggerSpec.paths) {
    Object.keys(swaggerSpec.paths).forEach((pathKey) => {
      const newPathKey = pathKey.startsWith('/api') ? pathKey : `/api${pathKey}`;

      pathsWithApiPrefix[newPathKey] = swaggerSpec.paths[pathKey];
    });
  }

  // Create updated spec with /api prefixed paths
  const updatedSpec = {
    ...swaggerSpec,
    paths: pathsWithApiPrefix,
  };

  // Remove server URL prefix since paths now include /api
  if (updatedSpec.servers && updatedSpec.servers.length > 0) {
    updatedSpec.servers[0].url = '';
  }

  fs.writeFileSync(outputPath, JSON.stringify(updatedSpec, null, 2), 'utf8');
  console.log(`✅ OpenAPI JSON file generated successfully at: ${outputPath}`);
  console.log('📦 You can now import this file into Postman or other API clients.');
} catch (error) {
  console.error('❌ Error generating OpenAPI JSON file:', error);
  throw error;
}
