// @see https://github.com/facebook/jest/issues/9430
// eslint-disable-next-line node/no-extraneous-import
import { jest } from '@jest/globals';
import axios from 'axios';
import { Component } from 'figma-api';
import { GetFileResult, GetImageResult, GetProjectFilesResult } from 'figma-api/lib/api-types';
import { promises as fs } from 'fs';
import path from 'path';

import Portal, { API } from '../Portal';

jest.useFakeTimers();

const PACKAGE = JSON.stringify({ name: 'figma-portal' });
const CONFIG = `- name: Components / Logo
  outputDir: media
  fileName: logo
  format: pdf
  scale: 1

- name: Banner
  outputDir: media
  fileName: banner
  format: pdf
  scale: 1
`;

jest.spyOn(fs, 'readFile').mockImplementation(filePath => {
  const basename = path.basename(filePath as string);
  let content = '';

  if (basename === 'package.json') content = PACKAGE;
  if (basename === '.figma.yml') content = CONFIG;

  return Promise.resolve(content);
});

jest.spyOn(API, 'getTeamProjects').mockImplementation(() => Promise.resolve({ projects: [{ id: 0, name: 'GitHub' }] }));
jest.spyOn(API, 'getProjectFiles').mockImplementation(() =>
  Promise.resolve({
    files: [{ key: '1', name: 'figma-portal' }],
  } as GetProjectFilesResult)
);
jest.spyOn(API, 'getFile').mockImplementation(() =>
  Promise.resolve({
    name: '',
    components: {
      nodeId_1: { key: 'component_1', name: 'Components / Logo' } as Component,
      nodeId_2: { key: 'component_2', name: 'Banner' } as Component,
    },
    lastModified: '',
    thumbnailUrl: '',
    version: '',
    document: {} as any,
    schemaVersion: 1,
    styles: {},
  } as GetFileResult)
);
jest.spyOn(API, 'getImage').mockImplementation(() =>
  Promise.resolve({
    images: {
      nodeId_1: 'https://example.com/images/logo',
      nodeId_2: 'https://example.com/images/banner',
    },
  } as GetImageResult)
);

describe('Portal', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { FIGMA_TOKEN: 'token', FIGMA_TEAM_ID: 'teamId' };
  });

  const portal = new Portal('media');
  const output: ([string, string] | [string])[] = [];

  jest.spyOn(fs, 'writeFile').mockImplementation((fileName, data) => {
    output.push([path.relative(process.cwd(), fileName.toString()), data.toString()]);

    return Promise.resolve();
  });

  jest.spyOn(fs, 'mkdir').mockImplementation(filePath => {
    output.push([path.relative(process.cwd(), filePath.toString())]);

    return Promise.resolve('');
  });

  jest.spyOn(axios, 'get').mockImplementation(url => {
    output.push([url]);

    return Promise.resolve({ data: Buffer.from('') });
  });

  it('Components extraction', async () => {
    await portal.extract('GitHub');

    expect(output).toMatchSnapshot();
  });
});
