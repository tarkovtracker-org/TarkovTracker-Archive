#!/usr/bin/env node

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { request, gql } from 'graphql-request';

const ENDPOINT = 'https://api.tarkov.dev/graphql';

const TASKS_QUERY = gql`
  query GetTasksForFixture {
    tasks {
      id
      name
      description
      factionName
      objectives {
        id
      }
      taskRequirements {
        task {
          id
        }
        status
      }
      alternatives
    }
  }
`;

const HIDEOUT_QUERY = gql`
  query GetHideoutForFixture {
    hideoutStations {
      id
      name
      description
      levels {
        id
        level
        itemRequirements {
          id
          count
        }
      }
    }
  }
`;

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'test',
  'fixtures',
  'tarkovdata',
  'generated'
);

const writeSnapshot = async (fileName, data) => {
  await mkdir(fixturesDir, { recursive: true });
  const filePath = path.join(fixturesDir, fileName);
  await writeFile(filePath, JSON.stringify(data, null, 2));
  console.log(`Wrote snapshot: ${filePath}`);
};

async function main() {
  const tasksResponse = await request(ENDPOINT, TASKS_QUERY);
  const hideoutResponse = await request(ENDPOINT, HIDEOUT_QUERY);
  const tasksFixture = {
    tasks: tasksResponse.tasks ?? [],
    data: tasksResponse.tasks ?? [],
    lastUpdated: new Date().toISOString(),
    source: 'tarkov.dev',
  };
  const hideoutFixture = {
    hideoutStations: hideoutResponse.hideoutStations ?? [],
    data: hideoutResponse.hideoutStations ?? [],
    lastUpdated: new Date().toISOString(),
    source: 'tarkov.dev',
  };
  await writeSnapshot('tasks.json', tasksFixture);
  await writeSnapshot('hideout.json', hideoutFixture);
}

main().catch((error) => {
  console.error('Failed to fetch Tarkov.dev snapshot:', error);
  process.exitCode = 1;
});
