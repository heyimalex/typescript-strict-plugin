import { PluginStrictFileChecker } from './PluginStrictFileChecker';
import { log, PluginInfo, setupProxy } from './utils';
import * as ts from 'typescript/lib/tsserverlibrary';

const init: ts.server.PluginModuleFactory = () => {
  function create(info: PluginInfo) {
    const proxy = setupProxy(info);
    const strictLanguageServiceHost = proxyHost(info);
    const strictLanguageService = ts.createLanguageService(strictLanguageServiceHost);

    log(info, 'Plugin initialized');

    proxy.getSemanticDiagnostics = function (filePath) {
      const strictFile = new PluginStrictFileChecker(info).isFileStrict(filePath);

      if (strictFile) {
        return strictLanguageService.getSemanticDiagnostics(filePath);
      } else {
        return info.languageService.getSemanticDiagnostics(filePath);
      }
    };

    return proxy;
  }

  return { create };
};

function proxyHost(info: PluginInfo): ts.LanguageServiceHost {
  const proxy: ts.LanguageServiceHost = Object.create(null);
  const host = info.languageServiceHost;
  const keys = Object.keys(host);
  // Bunch of methods that are needed but aren't own properties.
  // Not sure of a better way to handle this.
  keys.push(
    'getCurrentDirectory',
    'getCompilationSettings',
    'getCompilerHost',
    'fileExists',
    'readFile',
    'trace',
    'directoryExists',
    'realpath',
    'getCurrentDirectory',
    'getDirectories',
    'useCaseSensitiveFileNames',
    'getScriptFileNames',
    'getDefaultLibFileName',
    'getScriptSnapshot',
    'getScriptVersion',
  );
  for (const k of keys as Array<keyof ts.LanguageServiceHost>) {
    const serviceFunction = host[k];
    // @ts-ignore
    proxy[k] = (...args: Array<unknown>) => {
      // @ts-ignore
      return serviceFunction!.apply(host, args);
    };
  }
  proxy.getCompilationSettings = () => {
    const result = host.getCompilationSettings!.apply(host);
    return { ...result, strict: true };
  };

  return proxy;
}

module.exports = init;
