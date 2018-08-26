import { ModuleDefinition, ModuleMetadata } from 'botpress-module-sdk'
import { Logger } from 'botpress-module-sdk'
import { inject, injectable, tagged } from 'inversify'

import { createForModule } from './api'
import { ModuleConfigEntry } from './config/modules.config'
import { TYPES } from './misc/types'
import GhostService from './services/ghost/service'
import ConfigReader from './services/module/config-reader'

export type AvailableModule = {
  metadata: ModuleMetadata
  definition: ModuleConfigEntry
}

@injectable()
export class ModuleLoader {
  private loadedModules = []
  private _configReader?: ConfigReader

  constructor(
    @inject(TYPES.Logger)
    @tagged('name', 'ModuleLoader')
    private logger: Logger,
    @inject(TYPES.GhostService) private ghost: GhostService
  ) {}

  public get configReader() {
    if (this._configReader) {
      return this._configReader
    }

    throw new Error('Configuration reader is not initialized (you need to load modules first)')
  }

  public set configReader(value: ConfigReader) {
    if (this._configReader) {
      throw new Error('Modules have already been loaded')
    }

    this._configReader = value
  }

  public async loadModules(modules: Map<string, ModuleDefinition>) {
    this.configReader = new ConfigReader(this.logger, modules, this.ghost)
    await this.configReader.initialize()

    for (const [name, module] of modules) {
      const api = await createForModule(name)
      await (module.onInit && module.onInit(api))
    }

    // Once all the modules have been loaded, we tell them it's ready
    // TODO We probably want to wait until Botpress is done loading the other services etc
    for (const [name, module] of modules) {
      const api = await createForModule(name)
      await (module.onReady && module.onReady(api))
    }

    return []
  }

  public async getAvailableModules(): Promise<AvailableModule[]> {
    return this.loadedModules
  }
}
