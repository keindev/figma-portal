import { Arguments } from 'yargs';

import Portal from '../../index';

interface IArguments {
  dir: string;
  project: string;
}

export default {
  command: 'extract',
  desc: 'Export and download figma components',
  showInHelp: true,
  builder: {
    project: {
      string: true,
      alias: 'p',
      description: 'Project name',
    },
    dir: {
      string: true,
      alias: 'd',
      description: 'Default output directory',
      default: 'media',
    },
  },
  handler: ({ project, dir }: Arguments<IArguments>): Promise<void> => new Portal(dir).extract(project),
};
