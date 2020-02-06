#!/usr/bin/env node
import yargs from 'yargs';
import express from 'express';
import bodyParser from 'body-parser';
import { template, filter } from 'lodash';
import { ISharedArgv, sharedArgvBuilder } from './utils/shared-argv';
import { loadProjects, IProjectConfig } from './utils/projects';
import { FgMagenta, ResetColors } from './utils/common';

const uiProjects = filter(loadProjects(), (project: IProjectConfig) => !!project.entryUrl && !project.disabled);

const bookmarklet = (code: string): string => code.trim().split('\n').map(line => line.trim()).join(' ');

const redrectBookmarkletTmpl = template(`
function redirectPost(url, data) {
  const form = document.createElement('form');
  document.body.appendChild(form);
  form.method = 'post';
  form.action = url;
  for (let name in data) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = data[name];
      form.appendChild(input);
  }
  form.submit();
};
function objectify(storage) {
  return Object.keys(storage).reduce((acc, key) => (acc[key] = storage.getItem(key), acc), {});
};
function getJsonData() {
  return { localStorageData: objectify(window.localStorage), sessionStorageData: objectify(window.sessionStorage) };
};
redirectPost('http://localhost:<%= proxyPort %>/localzoo-login', { jsonData: JSON.stringify(getJsonData()) });
`);
const redrectBookmarklet = (argv: ISharedArgv) => bookmarklet(redrectBookmarkletTmpl({ proxyPort: argv.proxyPort }));

const welcomePageTmpl = template(`
<html>
<body>
  <strong>Drag the link to toolbar to create a shortcut:</strong><br/>
  <a href="javascript:<%= redrectBookmarklet %>">Redirect to localhost</a><br/><br/>

  <% if(uiProjects && uiProjects.length) { %>
    Then go to any application:<br/><br/>
  <% } %>

  <% uiProjects.forEach(function(project) { %>
    <strong><%= project.name %></strong><br/>
    <a href="<%= project.entryUrl %>"><%= project.entryUrl %></a><br/><br/>
  <% }); %>
</body>
</html>
`);
const welcomePage = (argv: ISharedArgv) => welcomePageTmpl({ redrectBookmarklet: redrectBookmarklet(argv), uiProjects });

const redirectPageTmpl = template(`
<html>
<script>
  const lsData = JSON.parse('<%= localStorageData %>');
  const ssData = JSON.parse('<%= sessionStorageData %>');

  Object.keys(lsData).forEach(key => {
    localStorage.setItem(key, lsData[key]);
  });

  Object.keys(ssData).forEach(key => {
    sessionStorage.setItem(key, ssData[key]);
  });

  window.location.href = '/';
</script>
</html>
`);
const redirectPage = (req: express.Request) => {
  const data = JSON.parse(req.body.jsonData);

  return redirectPageTmpl({
    localStorageData: JSON.stringify(data.localStorageData),
    sessionStorageData: JSON.stringify(data.sessionStorageData)
  });
};

function runLoginServer(argv: ISharedArgv) {
  const app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/',                (req, res) => { res.send(welcomePage(argv)); });
  app.get('/localzoo-login',  (req, res) => { res.send(welcomePage(argv)); });
  app.post('/localzoo-login', (req, res) => { res.send(redirectPage(req)); });

  app.listen(argv.loginPort, () => {
    console.log(`\n${FgMagenta}Please open http://localhost:${argv.proxyPort}/localzoo-login and create a redirect button${ResetColors}\n`);
  });
}

yargs
  .scriptName('localzoo-login')
  .command('$0', '', sharedArgvBuilder, runLoginServer)
  .help()
  .argv;
