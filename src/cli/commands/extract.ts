import TaskTree from 'tasktree-cli';
import { Arguments } from 'yargs';

type IArguments = Arguments<{ config: string; dir: string; project: string }>;

const extract = async ({ project, dir, config }: IArguments): Promise<void> => {
  const tree = TaskTree.tree();

  try {
    tree.start();

    const { default: Portal, CONFIG_FILE_NAME } = await import('../../Portal');
    const portal = new Portal(dir);

    await portal.extract(project, config ?? CONFIG_FILE_NAME);
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
    config: {
      string: true,
      alias: 'c',
      description: 'Extract configuration',
    },
  },
  handler: (args: IArguments): Promise<void> => extract(args),
};
