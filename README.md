<p align="center"><img src="https://cdn.jsdelivr.net/gh/keindev/figma-portal/media/banner.svg" alt="Package logo"></p>

<p align="center">
    <a href="https://github.com/keindev/figma-portal/actions"><img src="https://github.com/keindev/figma-portal/actions/workflows/build.yml/badge.svg" alt="Build Status"></a>
    <a href="https://codecov.io/gh/keindev/figma-portal"><img src="https://codecov.io/gh/keindev/figma-portal/branch/main/graph/badge.svg" /></a>
    <a href="https://www.npmjs.com/package/figma-portal"><img alt="npm" src="https://img.shields.io/npm/v/figma-portal.svg"></a>
    <a href="https://github.com/tagproject/ts-package-shared-config"><img src="https://img.shields.io/badge/standard--shared--config-nodejs%2Bts-green?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAfCAYAAACh+E5kAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJQSURBVHgB1VftUcMwDFU4/tMNyAZ0A7IBbBA2CExAmIBjApcJChO0TFA2SJkgMIGRyDNV3TSt26RN353OX/LHUyTZIdoB1tqMZcaS0imBDzxkeWaJWR51SX0HrJ6pdsJyifpdb4loq3v9A+1CaBuWMR0Q502DzuJRFD34Y9z3DXIRNy/QPWKZY27COlM6BtZZHWMJ3CkVa28KZMTJkDpCVLOhs/oL2gMuEhYpxeenPPah9EdczLkvpwZgnQHWnlNLiNQGYiWx5gu6Ehz4m+WNN/2i9Yd75CJmeRDXogbIFxECrqQ2wIvlLBOXaViuYbGQNSQLFSGZyOnulb2wadaGnyoSSeC8GBJkNDf5kloESAhy2gFIIPG2+ufUMtivn/gAEi+Gy4u6FLxh/qer8/xbLq7QlNh6X4mbtr+A3pylDI0Lb43YrmLmXP5v3a4I4ABDRSI4xjB/ghveoj4BCVm37JQADhGDgOA+YJ48TSaoOwKpt27aOQG1WRES3La65WPU3dysTjE8de0Aj8SsKS5sdS9lqCeYI08bU6d8EALYS5OoDW4c3qi2gf7f+4yODfj2DIcqdVzYKnMtEUO7RP2gT/W1AImxXSC3i7R7rfRuMT5G2xzSYzaCDzOyyzDeuNHZx1a3fOdJJwh28fRwwT1QY6Xzf7TvWG6ob/BIGPQ59ymUngRyRn2El6Fy5T7G0zl+JmoC3KRQXyT1xpfiJKIeAemzqBl6U3V5ocZNf4hHg61u223wn4nOqF8IzvF9IxCMkyfQ+i/lnnhlmW6h9+Mqv1SmQhehji4JAAAAAElFTkSuQmCC" alt="Standard Shared Config"></a>
</p>

Simple way to export a [Figma](https://www.figma.com/) components by name:ok_hand:

`figma-portal` is your choice:

- If you use and strictly adhere to the naming policy in component library
- Explaining to the designer where to get the `nodeId`, `teamId` or `fileKey` is too difficult

## Install

```console
npm install figma-portal --save-dev
```

## Usage

```
figma-portal extract -d DEFAULT_OUTPUT_DIR -p PROJECT_NAME -c .figma.yml
```

### Environment variables

- `FIGMA_TOKEN` - Personal or OAuth [token](https://www.figma.com/developers/api#authentication)
- `FIGMA_TEAM_ID` - Id of the team to list projects from

### Configuration

Create a config file - `.figma.yml`, and add a new description for the exported components:

```yml
# Unique name of the component within the project
- name: GitHub / Figma portal / Logo
  # Output directory if different from default
  outputDir: media
  # Output file name, if necessary (by default uses the name of the component)
  fileName: banner
  # A string enum for the image output format, can be jpg, png, svg, or pdf
  format: svg
  # A number between 0.01 and 4, the image scaling factor
  scale: 1
```

## API

Read the [API documentation](docs/api/index.md) for more information.
