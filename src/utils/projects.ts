import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { flow, mapValues } from 'lodash';
import { lsDirs, mergeDicts, readToml } from './common';

// See example in assets/example-localzoo.toml
export interface IProjectConfig {
  name: string;
  rootDir: string;
  configFilePath: string; // Used only for debug puproses

  disabled?: boolean;

  runCmd?: string;
  baseUrl?: string;

  targetHost?: string;
  targetPort?: number;

  entryUrl?: boolean;

  waitProject?: string;
  waitFile?: string
  waitDelay?: string;
}

export interface IProjectConfigMap {
  [name: string]: IProjectConfig
}

const addProjectInfo = (project: IProjectConfig, name: string, configFilePath: string): IProjectConfig => ({
  ...project,
  name,
  configFilePath,
  rootDir: join(dirname(configFilePath), project.rootDir || '.')
});

const readProjectConfigs = (filePath: string): IProjectConfigMap | null =>
  existsSync(filePath)
    ? mapValues(readToml(filePath), (project, name) => addProjectInfo(project, name, filePath))
    : null;

const loadProjectsFromDir: (dirPath: string) => IProjectConfigMap = flow(
  dirPath => [dirPath, ...lsDirs(dirPath)],
  dirPaths => dirPaths.map(dir => join(dir, '.localzoo.toml')),
  configPaths => configPaths.map(readProjectConfigs),
  mergeDicts
);

export const loadProjects = () => loadProjectsFromDir(process.cwd());
