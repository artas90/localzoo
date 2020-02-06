import yargs from 'yargs';

const DEFAULT_PROXY_PORT = 6010;
const DEFAULT_LOGIN_PORT = 6020;

export interface ISharedArgv {
  proxyPort: number;
  loginPort: number;
}

export const sharedArgvBuilder = (argv: yargs.Argv) => {
  argv.default('proxy-port', DEFAULT_PROXY_PORT);
  argv.default('login-port', DEFAULT_LOGIN_PORT);
};

export const sharedArgvStringify = (argv: ISharedArgv) => `--proxy-port=${argv.proxyPort} --login-port=${argv.loginPort}`;
