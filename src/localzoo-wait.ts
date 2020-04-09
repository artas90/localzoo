#!/usr/bin/env node
import yargs from 'yargs';
import waitOn from 'wait-on';
import { get, omitBy, isNil, isEmpty } from 'lodash';
import { join } from 'path';
import { loadProjects, IProjectConfigMap, IWaitConfig, IWaitFileConfig } from './utils/projects';

const getWaitFile = (waitCfg: IWaitConfig, projects: IProjectConfigMap): [string] => {
  const waitFileCfg = get(waitCfg, 'resources[0]', null) as IWaitFileConfig;
  if (!waitFileCfg || !waitFileCfg.project || !waitFileCfg.file) {
    return null;
  }

  const projectToWait = projects[waitFileCfg.project];
  if (!projectToWait || projectToWait.disabled) {
    return null;
  }

  return [ join(projectToWait.rootDir,  waitFileCfg.file) ];
}

const toWaitOnConfig = (projects: IProjectConfigMap, projectCurrName: string) => {
  const projectCurrent = projects[projectCurrName];
  if (!projectCurrent) {
    return null;
  }

  const { wait } = projectCurrent;
  if (!wait) {
    return null;
  }

  const delay = wait.delay || null;
  const resources = getWaitFile(wait, projects);
  const conf = omitBy({ delay, resources }, isNil);

  return !isEmpty(conf) ? (conf as waitOn.WaitOnOptions) : null;
}

const waitOnArgvBuilder = (argv: yargs.Argv) => {
  argv.default('project-name', null);
  argv.default('group', null);
};
const runWaitOn = async () => {
  const projectName = yargs.argv.projectName as string;
  const group = yargs.argv.group as string;
  const projects = loadProjects(group);

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
  } catch(e) {
    console.error('# wait error ' + e);
    process.exit(1);
  }
}

yargs
  .scriptName('localzoo-wait')
  .command('$0', '', waitOnArgvBuilder, runWaitOn)
  .help()
  .argv;
