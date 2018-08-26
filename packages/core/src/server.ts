import bodyParser from 'body-parser'
import { Logger } from 'botpress-module-sdk'
import errorHandler from 'errorhandler'
import express from 'express'
import { Server } from 'http'
import { inject, injectable, tagged } from 'inversify'

import { ConfigProvider } from './config/config-loader'
import { TYPES } from './misc/types'
import { BotRepository } from './repositories/bot-repository'
import { BotRouter } from './router/bot-router'
import { IndexRouter } from './router/index-router'
import ActionService from './services/action/action-service'
import { CMSService } from './services/cms/cms-service'
import FlowService from './services/dialog/flow-service'

const BASE_API_PATH = '/api/v1'

@injectable()
export default class HTTPServer {
  server: Server | undefined
  app: express.Express

  constructor(
    @inject(TYPES.ConfigProvider) private configProvider: ConfigProvider,
    @inject(TYPES.Logger)
    @tagged('name', 'HTTP')
    private logger: Logger,
    @inject(TYPES.BotRepository) botRepository: BotRepository,
    @inject(TYPES.CMSService) cmsService: CMSService,
    @inject(TYPES.FlowService) flowService: FlowService,
    @inject(TYPES.ActionService) actionService: ActionService
  ) {
    const routers = [new IndexRouter(), new BotRouter({ actionService, botRepository, cmsService, flowService })]

    this.app = express()
    this.app.use(bodyParser.json())
    this.app.use(BASE_API_PATH, [...routers.map(r => r.router)])

    if (process.env.NODE_ENV === 'development') {
      this.app.use(errorHandler())
    }
  }

  async start() {
    const botpressConfig = await this.configProvider.getBotpressConfig()
    const config = botpressConfig.httpServer

    await Promise.fromCallback(callback => {
      this.server = this.app.listen(config, callback)
    })

    this.logger.info(`API listening on http://${config.host || 'localhost'}:${config.port}`)

    return this.app
  }
}
