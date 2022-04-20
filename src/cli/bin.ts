import dotenv from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import extract from './commands/extract.js';

const argv = yargs(hideBin(process.argv));

dotenv.config();
argv.command(extract).demandCommand().wrap(argv.terminalWidth()).help().parse();
