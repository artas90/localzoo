#!/usr/bin/env node
import yargs from 'yargs';
import concurrently from 'concurrently';
import { map, filter } from 'lodash';
import { join } from 'path';
import { copyFileSync, existsSync } from 'fs';
import { ISharedArgv, sharedArgvBuilder, sharedArgvStringify } from './utils/shared-argv';
import { loadProjects, IProjectConfig } from './utils/projects';
import { FgGreen, FgRed, ResetColors, objToString } from './utils/common';

const toConcurrently = (project: IProjectConfig) =>
  (project.disabled || !project.runCmd) ? null : {
    name: project.name,
    command: `localzoo-wait --project-name=${project.name} && cd ${project.rootDir} && ${project.runCmd}`
  };

const runInitConfig = () => {
  const copyFrom = join(__dirname, '../assets/example-localzoo.toml');
  const copyTo = join(process.cwd(), './localzoo.toml');

  if (existsSync(copyTo)) {
    console.log(`File 'localzoo.toml' is already exists in this dir`);
    return;
  }

  copyFileSync(copyFrom, copyTo);
  console.log(`File '${copyTo}' created`);
};

export const runConcurrently = (argv: ISharedArgv) => {
  process.on('SIGINT', () => {
    console.log("Caught interrupt signal");
    process.exit();
  });

  concurrently(
    [
      ...map(loadProjects(), toConcurrently).filter(Boolean),
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
const runDiscover = () => {
  const projects = loadProjects();
  const enabledProjects = filter(projects, (project: IProjectConfig) => !project.disabled);
  const disabledProjects = filter(projects, (project: IProjectConfig) => project.disabled);

  console.log(`${FgGreen}* Enabled Projects *${ResetColors}\n${objToString(enabledProjects)}`);
  console.log(`${FgRed}* Disabled Projects *${ResetColors}\n${objToString(disabledProjects)}`);
}

yargs
  .scriptName('localzoo')
  .command('init', 'init config in current dir', {}, runInitConfig)
  .command('up', 'start all microservices and proxy', sharedArgvBuilder, runConcurrently)
  .command('discover', 'just find and show project configs', {}, runDiscover)
  .demandCommand()
  .help()
  .argv;
