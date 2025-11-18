#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { request, gql } from 'graphql-request';

const ENDPOINT = 'https://api.tarkov.dev/graphql';

type TaskObjective = {
  id: string;
};

type TaskRequirement = {
  task?: {
    id: string;
  };
  status?: string;
};

type Task = {
  id: string;
  name: string;
  description?: string;
  factionName?: string;
  objectives?: TaskObjective[];
  taskRequirements?: TaskRequirement[];
  alternatives?: string[] | null;
};

type TasksQueryResult = {
  tasks?: Task[];
};

type HideoutLevelRequirement = {
  id: string;
  count: number;
};

type HideoutLevel = {
  id: string;
  level: number;
  itemRequirements?: HideoutLevelRequirement[];
};

type HideoutStation = {
  id: string;
  name: string;
  description?: string;
  levels?: HideoutLevel[];
};

type HideoutQueryResult = {
  hideoutStations?: HideoutStation[];
};

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

const writeSnapshot = async (fileName: string, data: unknown): Promise<void> => {
  await mkdir(fixturesDir, { recursive: true });
  const filePath = path.join(fixturesDir, fileName);
  await writeFile(filePath, JSON.stringify(data, null, 2));
  console.log(`Wrote snapshot: ${filePath}`);
};

async function main(): Promise<void> {
  const tasksResponse = await request<TasksQueryResult>(ENDPOINT, TASKS_QUERY);
  const hideoutResponse = await request<HideoutQueryResult>(ENDPOINT, HIDEOUT_QUERY);
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

main().catch((error: unknown) => {
  console.error('Failed to fetch Tarkov.dev snapshot:', error);
  process.exitCode = 1;
});
