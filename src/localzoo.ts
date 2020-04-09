#!/usr/bin/env node
import yargs from 'yargs';
import concurrently from 'concurrently';
import { map, filter } from 'lodash';
import { join } from 'path';
import { copyFileSync, existsSync } from 'fs';
import { ISharedArgv, sharedArgvBuilder, sharedArgvStringify } from './utils/shared-argv';
import { loadProjects, IProjectConfig } from './utils/projects';
import { FgGreen, FgRed, ResetColors, objToString } from './utils/common';

const toConcurrently = (project: IProjectConfig, argv: ISharedArgv) => {
  const { scripts } = project;
  if (project.disabled || !scripts) {
    return null;
  }

  if (!scripts.start) {
    console.error(`localzoo: project '${project.name}' has no 'start' script`);
    return null;
  }

  const args = `--project-name=${project.name}`;
  return {
    name: project.name,
    command: `localzoo-wait ${args} && cd ${project.rootDir} && ${scripts.start}`
  };
}

const runInitConfig = () => {
  const copyFrom = join(__dirname, '../assets/example-localzoo.yaml');
  const copyTo = join(process.cwd(), './localzoo.yaml');

  if (existsSync(copyTo)) {
    console.log(`File 'localzoo.yaml' is already exists in this dir`);
    return;
  }

  copyFileSync(copyFrom, copyTo);
  console.log(`File '${copyTo}' created`);
};

const runConcurrently = (argv: ISharedArgv) => {
  const projects = loadProjects(argv.group);

  process.on('SIGINT', () => {
    console.log("Caught interrupt signal");
    process.exit();
  });

  concurrently(
    [
      ...map(projects, project => toConcurrently(project, argv)).filter(Boolean),
      {
        name: 'localzoo-proxy',
        command: `cd ${process.cwd()} && localzoo-proxy ${sharedArgvStringify(argv)}`
      },
      {
        name: 'localzoo-login',
        command: `localzoo-login ${sharedArgvStringify(argv)}`
      }
    ],
    {
      prefix: 'name'
    }
  );
}

const discoverArgvBuilder = (argv: yargs.Argv) => {
  argv.default('group', null);
};
const runDiscover = () => {
  const group = yargs.argv.group as string;
  const projects = loadProjects(group)

  const enabledProjects = filter(projects, (project: IProjectConfig) => !project.disabled);
  const disabledProjects = filter(projects, (project: IProjectConfig) => project.disabled);

  console.log(`${FgGreen}* Enabled Projects *${ResetColors}\n${objToString(enabledProjects)}`);
  console.log(`${FgRed}* Disabled Projects *${ResetColors}\n${objToString(disabledProjects)}`);
}

yargs
  .scriptName('localzoo')
  .command('init', 'init config in current dir', {}, runInitConfig)
  .command('start', 'start all microservices and proxy', sharedArgvBuilder, runConcurrently)
  .command('discover', 'just find and show project configs', discoverArgvBuilder, runDiscover)
  .demandCommand()
  .help()
  .argv;
