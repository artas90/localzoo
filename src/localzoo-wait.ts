#!/usr/bin/env node
import yargs from 'yargs';
import waitOn from 'wait-on';
import { get } from 'lodash';
import { join } from 'path';
import { loadProjects, IProjectConfigMap, IProjectConfig } from './utils/projects';

const getWaitFile = (projects: IProjectConfigMap, projectCurrent: IProjectConfig): string => {
  const projectToWaitName = get(projectCurrent, 'waitProject', null) as string;
  const projectToWait = projectToWaitName && projects[projectToWaitName];

  return (projectToWait && !projectToWait.disabled)
    ? join(projectToWait.rootDir, get(projectCurrent, 'waitFile', ''))
    : null;
}

const toWaitOnConfig = (projects: IProjectConfigMap, projectCurrName: string) => {
  const projectCurrent = projects[projectCurrName];
  if (!projectCurrent) {
    return null;
  }

  const delay = get(projectCurrent, 'waitDelay', 0) as number;
  const waitFile = getWaitFile(projects, projectCurrent);
  if (delay === 0 && !waitFile) {
    return null;
  }

  return { delay, resources: [ waitFile ] };
}

const waitOnArgvBuilder = (argv: yargs.Argv) => {
  argv.default('project-name', null);
};
const runWaitOn = async () => {
  const projects = loadProjects();
  const projectName = yargs.argv.projectName as string;

  const conf = toWaitOnConfig(projects, projectName);
  if (!conf) {
    process.exit(0);
  }
  
  const waitStr = JSON.stringify(conf);
  console.log(`* Wait on ${waitStr} *`);
  
  try {
    await waitOn(conf);
    console.log(`* End wait on ${waitStr} *`);
    process.exit(0);
  } catch {
    process.exit(1);
  }
}

yargs
  .scriptName('localzoo-wait')
  .command('$0', '', waitOnArgvBuilder, runWaitOn)
  .help()
  .argv;
