import axios from 'axios';
import execBuffer from 'exec-buffer';
import * as Figma from 'figma-api';
import { Project, ProjectFile } from 'figma-api/lib/api-types';
import { promises as fs } from 'fs';
import jpegtran from 'jpegtran-bin';
import objectHash from 'object-hash';
import optipng from 'optipng-bin';
import Package from 'package-json-helper';
import path from 'path';
import { optimize } from 'svgo';
import TaskTree, { Task } from 'tasktree-cli';
import yaml from 'yaml';

import { Format, IDownloadLink, IExportFileConfig, IOptimizationCallback } from './types';

export const API = new Figma.Api({ personalAccessToken: process.env.FIGMA_TOKEN ?? '' });
export const CONFIG_FILE_NAME = '.figma.yml';
const DEFAULT_SCALE = 1;
const LIBRARIES = {
  [Format.JPG]: (buffer: Buffer): Promise<Buffer> =>
    execBuffer({
      input: buffer,
      bin: jpegtran,
      args: ['-copy', 'none', '-optimize', '-outfile', execBuffer.output, execBuffer.input],
    }),
  [Format.PNG]: (buffer: Buffer): Promise<Buffer> =>
    execBuffer({
      input: buffer,
      bin: optipng,
      args: ['-strip', 'all', '-clobber', '-o', '3', '-out', execBuffer.output, '-fix', '-i', '0', execBuffer.input],
    }),
  [Format.SVG]: async (buffer: Buffer): Promise<Buffer> => {
    const { data } = await optimize(buffer.toString(), { multipass: true });

    return Buffer.from(data);
  },
  [Format.PDF]: null,
};

export default class Portal {
  #defaultOutputDir: string;

  constructor(defaultOutputDir: string) {
    this.#defaultOutputDir = defaultOutputDir;
  }

  async extract(projectName: string, configPath = CONFIG_FILE_NAME): Promise<void> {
    const mainTask = TaskTree.add('figma-portal:');

    if (process.env.FIGMA_TEAM_ID) {
      let task = mainTask.add('Export projects metadata:');
      const { projects } = await API.getTeamProjects(process.env.FIGMA_TEAM_ID);
      const project = projects.find(({ name }) => name === projectName);

      if (project) {
        const links = await this.exportProjectComponents(project, task, configPath);

        task.complete('Projects metadata exported!', true);
        task = mainTask.add('Download and minify:');
        await Promise.all(links.map(options => this.download(...options, task)));
        task.complete();
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
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    let buffer = response.data;

    if (plugin) {
      subtask.update(`Minify {bold ${base}} (./${path.relative(process.cwd(), dir)})`);
      buffer = await plugin(buffer);
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
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

  private async exportProjectComponents(project: Project, task: Task, configPath: string): Promise<IDownloadLink[]> {
    const subtask = task.add(`Export {bold ${project.name}}:`);
    const { files } = await API.getProjectFiles(project.id.toString());
    const pkg = new Package();

    await pkg.read();

    const file = files.find(({ name }) => name === pkg.nameWithoutScope);
    let downloadLinks: IDownloadLink[] = [];

    if (file) {
      const content = await fs.readFile(configPath, 'utf8');
      const config: IExportFileConfig[] = content ? yaml.parse(content) : [];

      downloadLinks = await this.exportComponents(file, new Map(config.map(item => [item.name, item])), subtask);
      subtask.complete(`{bold ${project.name}}`);
    } else {
      subtask.fail(`File with name "{bold ${pkg.nameWithoutScope}}" not found!`);
    }

    return downloadLinks;
  }
}
