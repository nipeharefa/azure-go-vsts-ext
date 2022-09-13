import * as tasks from 'azure-pipelines-task-lib';
import * as tools from 'azure-pipelines-tool-lib';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface getFilename {
  url: string
  filename: string
}

async function run() {
  let version = getVersion();
  await install(version);
}
function getVersion(): string {
  let version = tasks.getInput('version', true)!;
  return version;
}

async function install(version: string) {
  // Install
  let toolPath = tools.findLocalTool('goose', version);

  if (!toolPath) {
      toolPath = await downloadCloudSDK(version);
      tasks.debug("goose is cached under " + toolPath);
  }

  toolPath = path.join(toolPath);
  tools.prependPath(toolPath);
}

function getFileName(version: string): getFilename {
  let platform: string;
  let architecture: string;

  switch(os.type()) {
    case "Darwin":
        platform = "darwin";
        break;
    
    case "Linux":
        platform = "linux";
        break;
    
    case "Windows_NT":
        platform = "windows";
        break;
    
    default:
        throw `Operating system ${os.type()} is not supported`;
}

switch(os.arch()) {
    case "x64":
        architecture = "x86_64";
        break;
    
    case "x32":
        architecture = "x86";
        break;
    
    default:
        throw `Architecture ${os.arch()} is not supported`;
}

  let filename = `goose_${version}_${platform}_${architecture}`;
  return {
    filename: filename,
    url: `https://github.com/pressly/goose/releases/download/${version}/goose_${platform}_${architecture}`,
  }
}

async function downloadCloudSDK(version: string): Promise<string> {
  let file = getFileName(version);
  let downloadPath;
  try {
      downloadPath = await tools.downloadTool(file.url, `${file.filename}/bin/goose`);
      tasks.debug("download path " +downloadPath);
  } catch (error: any) {
      tasks.debug(error);
      throw `Failed to download version ${version}. Please verify that the version is valid and resolve any other issues. ${error}`;
  }

  fs.chmodSync(downloadPath, '777');

  let extPath = path.dirname(downloadPath);
  tasks.debug("[downloadPaht]=" + extPath);
  return await tools.cacheDir(path.join(extPath), 'goose', `${version}`);

}
run().catch(reason => tasks.setResult(tasks.TaskResult.Failed, reason));
