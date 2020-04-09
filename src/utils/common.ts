import yaml from 'js-yaml';
import { join } from 'path';
import { merge } from 'lodash';
import { readdirSync, statSync, readFileSync } from 'fs';

export const isDirectory = (pth: string) => statSync(pth).isDirectory();

export const lsDirs = (dirPath: string) => readdirSync(dirPath).map(item => join(dirPath, item)).filter(isDirectory);

export const readYaml = (filePath: string) => yaml.safeLoad(readFileSync(filePath).toString());

export const mergeDicts = (dicts: any[]) => merge({}, ...dicts);

export const objToString = (obj: any) => JSON.stringify(obj, null, 2);

export const FgRed = "\x1b[31m"
export const FgGreen = "\x1b[32m"
export const FgMagenta = "\x1b[35m"
export const ResetColors = '\x1b[0m';
