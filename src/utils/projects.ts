import { existsSync } from 'fs';
import { join, dirname } from 'path';
import {
  flow, mapValues, get, pickBy, omit, includes, intersection,
  startsWith, trimStart, filter, isEmpty, Dictionary,
} from 'lodash';
import { lsDirs, mergeDicts, readYaml } from './common';

export interface IProxyConfig {
  baseUrl: string;
  targetHost?: string;
  targetPort?: number;
}

export interface IWaitFileConfig {
  file: string;
  project: string;
}

export interface IWaitConfig {
  delay?: number;
  resources?: [IWaitFileConfig]; // only one dependency for now
}

export interface IProjectUrlShortcut {
  name: string;
  url: string;
}

// See example in assets/example-localzoo.yaml
export interface IProjectConfig {
  name: string;
  rootDir: string;
  configFilePath: string; // Used only for debug puproses
  disabled?: boolean;

  scripts?: Dictionary<string>; 
  proxy?: IProxyConfig;
  wait?: IWaitConfig;
  urlShortcuts?: IProjectUrlShortcut[];
  labels?: string[]
}

export interface IProjectConfigMap {
  $groups?: any;
  [name: string]: IProjectConfig
}

type ProjectGroup = string[];

const addProjectInfo = (project: IProjectConfig, name: string, configFilePath: string): IProjectConfig => ({
  ...project,
  name,
  configFilePath,
  rootDir: join(dirname(configFilePath), project.rootDir || '.')
});

const readProjectConfigs = (filePath: string): IProjectConfigMap | null =>
  existsSync(filePath)
    ? mapValues(readYaml(filePath), (project, name) => addProjectInfo(project, name, filePath))
    : null;

const isLabelOrName = (group: string[], cfg: IProjectConfig): boolean => {
  const labels = filter(group, label => startsWith(label, '~')).map(label => trimStart(label, '~'));
  return !!intersection(labels, cfg.labels).length || includes(group, cfg.name);
}

const filterByGroup = (config: IProjectConfigMap, groupName: string): IProjectConfigMap => {
  const groups = config.$groups;
  config = omit(config, ['$groups']);

  if (isEmpty(config)) {
    console.error(`Can't find configs`);
    process.exit(1);
  }

  if (!groupName) {
    console.log(`* Use all configs *`);
    return config;
  }

  const group = get(groups, groupName) as ProjectGroup;
  if (!group) {
    console.error(`Group '${groupName}' not found`);
    process.exit(1);
  }

  const filtered = pickBy(config, config => isLabelOrName(group, config));
  console.log(`* Use '${groupName}' group *`);

  return filtered;
};

const loadProjectsFromDir: (dirPath: string) => IProjectConfigMap = flow(
  dirPath => [dirPath, ...lsDirs(dirPath)],
  dirPaths => dirPaths.map(dir => join(dir, 'localzoo.yaml')),
  configPaths => configPaths.map(readProjectConfigs),
  mergeDicts,
);

export const loadProjects = (groupName: string) => filterByGroup(loadProjectsFromDir(process.cwd()), groupName);
