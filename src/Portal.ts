import axios from 'axios';
import * as Figma from 'figma-api';
import { Project, ProjectFile } from 'figma-api/lib/api-types';
import { promises as fs } from 'fs';
import objectHash from 'object-hash';
import Package from 'package-json-helper';
import path from 'path';
import { optimize, OptimizedError, OptimizedSvg } from 'svgo';
import TaskTree from 'tasktree-cli';
import { Task } from 'tasktree-cli/lib/Task';
import yaml from 'yaml';

import { Format, IDownloadLink, IExportFileConfig, IOptimizationCallback } from './types.js';

export const API = new Figma.Api({ personalAccessToken: process.env.FIGMA_TOKEN ?? '' });
export const CONFIG_FILE_NAME = '.figma.yml';
const DEFAULT_SCALE = 1;
const LIBRARIES = {
  [Format.JPG]: null,
  [Format.PNG]: null,
  [Format.SVG]: (buffer: Buffer) => {
    const result: OptimizedSvg | OptimizedError = optimize(buffer.toString(), { multipass: true });

    return 'data' in result ? Buffer.from(result.data) : null;
  },
  [Format.PDF]: null,
};

export default class Portal {
  #defaultOutputDir: string;

  constructor(defaultOutputDir: string) {
    this.#defaultOutputDir = defaultOutputDir;
  }

  async extract(projectName: string, fileName?: string, configPath = CONFIG_FILE_NAME): Promise<void> {
    const mainTask = TaskTree.add('figma-portal:');

    if (process.env.FIGMA_TEAM_ID) {
      let task = mainTask.add('Export projects metadata:');
      const { projects } = await API.getTeamProjects(process.env.FIGMA_TEAM_ID);
      const project = projects.find(({ name }) => name === projectName);

      if (project) {
        const links = await this.exportProjectComponents(project, task, configPath, fileName);

        task.complete('Projects metadata exported!', true);

        if (links.length) {
          task = mainTask.add('Download and minify:');
          await Promise.all(links.map(options => this.download(...options, task)));
          task.complete();
        }
      } else {
        task.fail(`Project with name="{bold ${projectName}} not found!"`);
      }

      mainTask.complete();
    } else {
      mainTask.fail('FIGMA_TEAM_ID is not defined!');
    }
  }

  private async download(
    url: string,
    filePath: string,
    plugin: IOptimizationCallback | null,
    task: Task
  ): Promise<void> {
    const { dir, base } = path.parse(filePath);
    const subtask = task.add(`Download {bold ${base}} (./${path.relative(process.cwd(), dir)}):`);
    const { data } = await axios.get(url, { responseType: 'arraybuffer' });
    let buffer;

    if (plugin) {
      subtask.update(`Minify {bold ${base}} (./${path.relative(process.cwd(), dir)})`);
      buffer = await plugin(data);
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer ?? data);
    subtask.complete(`{bold ${base}} (./${path.relative(process.cwd(), dir)})`);
  }

  private async exportComponents(
    file: ProjectFile,
    configs: Map<string, IExportFileConfig>,
    task: Task
  ): Promise<IDownloadLink[]> {
    const subtask = task.add(`Export file {bold ${file.name}} components`);
    const { components } = await API.getFile(file.key);
    const exportOptions = new Map<string, { format: Format; ids: Set<string>; scale: number }>();
    const downloadLinks = await this.exportImages(
      file.key,
      exportOptions,
      new Map<string, [string, IOptimizationCallback | null]>(
        Object.entries(components).reduce((acc, [nodeId, { name }]) => {
          const config = configs.get(name);

          if (config) {
            const { format = Format.SVG, scale = DEFAULT_SCALE, outputDir = this.#defaultOutputDir } = config;
            const hash = objectHash({ format, scale });
            const exportFormat = exportOptions.get(hash) ?? { format, scale, ids: new Set() };
            const fileName = (config.fileName || name).replace(/(\s+\/\s+)|(\s+\/)|(\/\s+)/g, '/');

            exportFormat.ids.add(nodeId);
            exportOptions.set(hash, exportFormat);
            acc.push([
              nodeId,
              [path.normalize(`${path.join(process.cwd(), outputDir, fileName)}.${format}`), LIBRARIES[format]],
            ]);
          }

          return acc;
        }, [] as [string, [string, IOptimizationCallback | null]][])
      )
    );

    subtask.complete(`{bold ${file.name}}`);

    return downloadLinks;
  }

  private async exportImages(
    fileKey: string,
    exportOptions: Map<string, { format: Format; ids: Set<string>; scale: number }>,
    downloadOptions: Map<string, [string, IOptimizationCallback | null]>
  ): Promise<[string, string, IOptimizationCallback | null][]> {
    const exportedImages = await Promise.all(
      [...exportOptions.values()].map(({ ids, ...parameters }) =>
        API.getImage(fileKey, { ids: [...ids.keys()].join(','), ...parameters })
      )
    );

    return exportedImages.reduce((acc, { images }) => {
      Object.entries(images).map(([nodeId, url]) => {
        const options = downloadOptions.get(nodeId);

        if (options && url) acc.push([url, ...options]);
      });

      return acc;
    }, [] as [string, string, IOptimizationCallback | null][]);
  }

  private async exportProjectComponents(
    project: Project,
    task: Task,
    configPath: string,
    fileName?: string
  ): Promise<IDownloadLink[]> {
    const subtask = task.add(`Export {bold ${project.name}}:`);
    const { files } = await API.getProjectFiles(project.id.toString());
    let downloadLinks: IDownloadLink[] = [];
    let searchName: string | undefined;

    if (fileName) {
      searchName = fileName;
    } else {
      const pkg = new Package();

      await pkg.read();
      searchName = pkg.nameWithoutScope;
    }

    if (searchName) {
      const file = files.find(({ name }) => name === searchName);

      if (file) {
        const content = await fs.readFile(configPath, 'utf8');
        const config: IExportFileConfig[] = content ? yaml.parse(content) : [];

        downloadLinks = await this.exportComponents(file, new Map(config.map(item => [item.name, item])), subtask);
        subtask.complete(`{bold ${project.name}}`);
      } else {
        subtask.fail(`File with name "{bold ${searchName}}" not found!`);
      }
    }

    return downloadLinks;
  }
}
