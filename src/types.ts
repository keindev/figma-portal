export enum Format {
  JPG = 'jpg',
  PNG = 'png',
  SVG = 'svg',
  PDF = 'pdf',
}

export type IOptimizationCallback = (buffer: Buffer) => Buffer | null;
export type IDownloadLink = [string, string, IOptimizationCallback | null];

export interface IExportFileConfig {
  /** Name of component in Figma */
  fileName?: string;
  /** Image output format */
  format?: Format;
  /** Component name */
  name: string;
  /** File extraction directory */
  outputDir?: string;
  /** Image scaling factor. Number between 0.01 and 4.  */
  scale?: number;
}
