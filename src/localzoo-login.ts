#!/usr/bin/env node
import yargs from 'yargs';
import express from 'express';
import bodyParser from 'body-parser';
import { template, filter, isEmpty, keys } from 'lodash';
import { ISharedArgv, sharedArgvBuilder } from './utils/shared-argv';
import { loadProjects, IProjectConfig } from './utils/projects';
import { FgMagenta, ResetColors } from './utils/common';

const STORAGE_DATA = {
  localStorageData: '{}',
  sessionStorageData: '{}'
};

const getUiProjects = (argv: ISharedArgv) =>
  filter(loadProjects(argv.group), (cfg: IProjectConfig) => !isEmpty(cfg.urlShortcuts) && !cfg.disabled);

const bookmarklet = (code: string): string => code.trim().split('\n').map(line => line.trim()).join(' ');

const storageKeysCount = (storage: string) => {
  try { return keys(JSON.parse(storage)).length; }
  catch { return 0; }
};

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
  return Object.keys(storage).reduce(function(acc, key) { acc[key] = JSON.stringify(storage.getItem(key)); return acc; }, {});
};
function getJsonData() {
  return { localStorageData: objectify(window.localStorage), sessionStorageData: objectify(window.sessionStorage) };
};
redirectPost('http://localhost:<%= proxyPort %>/localzoo-login', { jsonData: JSON.stringify(getJsonData()) });
`);
const redrectBookmarklet = (argv: ISharedArgv) => bookmarklet(redrectBookmarkletTmpl({ proxyPort: argv.proxyPort }));

const welcomePageTmpl = template(`
<html>
<body style="max-width: 600px; word-break: break-all;">
  <div style="padding: 10px; border: 1px solid gray; margin-top: 10px;">
    <em>Bookmarklets:</em><br/><br/>

    <strong>Drag the link to toolbar to create a bookmarklet:</strong><br/>
    <a href="javascript:<%= redrectBookmarklet %>">Redirect to localhost</a>
  </div>

  <% if(uiProjects && uiProjects.length) { %>
    <div style="padding: 10px; border: 1px solid gray; margin-top: 10px;">
      <em>Shortcuts:</em><br/><br/>

      <% uiProjects.forEach(function(project) { %>
        <strong><%= project.name %>:</strong>

        <% project.urlShortcuts.forEach(function(shortcut) { %>
          <br/><br/>
          <span><%= shortcut.name %></span></br>
          <a href="<%= shortcut.url %>"><%= shortcut.url %></a>
        <% }); %>

      <% }); %>
    </div>
  <% } %>

  <div style="padding: 10px; border: 1px solid gray; margin-top: 10px;">
    <em>Session:</em><br/><br/>

    <strong>Open the following link to restore session:</strong><br/>
    <a href="http://localhost:<%= proxyPort %>/localzoo-login/restore">Restore session</a><br/><br/>

    <strong>Current stored keys:</strong><br/>
    localStorage: <%= localStorageKeysCount %><br/>
    sessionStorage: <%= sessionStorageKeysCount %>
  </div>
</body>
</html>
`);
const welcomePage = (argv: ISharedArgv) => welcomePageTmpl({
  redrectBookmarklet: redrectBookmarklet(argv),
  uiProjects: getUiProjects(argv),
  proxyPort: argv.proxyPort,
  localStorageKeysCount: storageKeysCount(STORAGE_DATA.localStorageData),
  sessionStorageKeysCount: storageKeysCount(STORAGE_DATA.sessionStorageData),
});

const redirectPageTmpl = template(`
<html>
<script>
  const lsData = <%= localStorageData %>;
  const ssData = <%= sessionStorageData %>;

  Object.keys(lsData).forEach(function(key) {
    localStorage.setItem(key, JSON.parse(lsData[key]));
  });

  Object.keys(ssData).forEach(function(key) {
    sessionStorage.setItem(key, JSON.parse(ssData[key]));
  });

  window.location.href = '/';
</script>
</html>
`);
const redirectPage = (req: express.Request) => {
  const data = JSON.parse(req.body.jsonData);

  STORAGE_DATA.localStorageData = JSON.stringify(data.localStorageData);
  STORAGE_DATA.sessionStorageData = JSON.stringify(data.sessionStorageData);

  return redirectPageTmpl(STORAGE_DATA);
};
const redirectPageRestore = () => {
  return redirectPageTmpl(STORAGE_DATA);
};

const runLoginServer = (argv: ISharedArgv) => {
  const app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/',                       (req, res) => { res.send(welcomePage(argv));     });
  app.get('/localzoo-login',         (req, res) => { res.send(welcomePage(argv));     });
  app.post('/localzoo-login',        (req, res) => { res.send(redirectPage(req));     });
  app.get('/localzoo-login/restore', (req, res) => { res.send(redirectPageRestore()); });

  app.listen(argv.loginPort, () => {
    console.log(`\n${FgMagenta}Please open http://localhost:${argv.proxyPort}/localzoo-login and create a redirect button${ResetColors}\n`);
  });
}

yargs
  .scriptName('localzoo-login')
  .command('$0', '', sharedArgvBuilder, runLoginServer)
  .help()
  .argv;
