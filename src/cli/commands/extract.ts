import TaskTree from 'tasktree-cli';
import { Arguments } from 'yargs';

import Portal from '../../index';

interface IArguments {
  dir: string;
  project: string;
}

const extract = async (project: string, dir: string): Promise<void> => {
  const tree = TaskTree.tree().start();
  const portal = new Portal(dir);

  try {
    await portal.extract(project);
    tree.exit();
  } catch (error) {
    if (error instanceof Error) {
      tree.fail(error);
    }
  }
};

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
  handler: ({ project, dir }: Arguments<IArguments>): Promise<void> => extract(project, dir),
};
