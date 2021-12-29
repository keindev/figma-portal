import TaskTree from 'tasktree-cli';
import { Arguments } from 'yargs';

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
  handler: async ({
    project,
    dir,
    config,
  }: Arguments<{
    config: string;
    dir: string;
    project: string;
  }>): Promise<void> => {
    const tree = TaskTree.tree().start();
    const { default: Portal, CONFIG_FILE_NAME } = await import('../../Portal');
    const portal = new Portal(dir);

    try {
      await portal.extract(project, config ?? CONFIG_FILE_NAME);
      tree.exit();
    } catch (error) {
      if (error instanceof Error) {
        tree.fail(error);
      }
    }
  },
};
