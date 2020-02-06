#!/usr/bin/env node
import yargs from 'yargs';
import http from 'http';
import httpProxy from 'http-proxy';
import HttpProxyRules from 'http-proxy-rules';
import { fromPairs, map, compact, trimStart } from 'lodash';
import { ISharedArgv, sharedArgvBuilder } from './utils/shared-argv';
import { objToString } from './utils/common';
import { loadProjects, IProjectConfig, IProjectConfigMap } from './utils/projects';

function toHttpRulePair(project: IProjectConfig): [string, string] {
  if (project.disabled || !project.baseUrl) {
    return null;
  }

  const baseUrl = '/' + trimStart(project.baseUrl, '/');

  const target = [
    project.targetHost || 'http://localhost',
    project.targetPort ? `:${project.targetPort}` : '',
    baseUrl 
  ].join('');

  return [ baseUrl, target ];
}

const toHttpProxyRules = (projects: IProjectConfigMap, argv: ISharedArgv) => ({
  rules: {
    ...fromPairs(compact(map(projects, toHttpRulePair))),
    '/localzoo-login': `http://localhost:${argv.loginPort}/localzoo-login`
  },
  default: `http://localhost:${argv.loginPort}`
});

function runProxy(argv: ISharedArgv) {
  const projects = loadProjects();
  const reverseProxy = httpProxy.createProxy();
  const rules = toHttpProxyRules(projects, argv);
  const proxyRules = new HttpProxyRules(rules);

  console.log(`* Dev proxy started at http://localhost:${argv.proxyPort} *`);
  console.log(objToString(rules));
  
  http.createServer((req, res) => {
    const target = proxyRules.match(req);
    if (target) {
      return reverseProxy.web(req, res, {target, secure: false});
    }
  
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('The request url and path did not match any of the listed rules!');
  }).listen(argv.proxyPort);
}

yargs
  .scriptName('localzoo-proxy')
  .command('$0', '', sharedArgvBuilder, runProxy)
  .help()
  .argv;
