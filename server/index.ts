import * as path from 'path'
import * as http from 'http'
import * as express from 'express'
import * as nunjucks from 'nunjucks'
import * as bodyParser from 'body-parser'
import * as methodOverride from 'method-override'
import * as compress from 'compression'
import * as cookieParser from 'cookie-parser'
import * as passport from 'passport'
import { sessionParser, notFoundHandler, errorHandler, corsHandler } from '~/plugin.config'
import { nuxt, nuxtReady, nuxtHandler } from '~/nuxt.config'
import { Host, Port, session_secret } from '~/config'
import logger from '~/utils/logger'
import restful from '~/middleware/restful'
import { strategy } from '~/middleware/auth'
import controller from '~/controller'
import api_v1 from '~/api/v1'

async function start (): Promise<void> {
  let app: express.Application = express()

  // 设置 View 模版
  app.set('view', path.resolve(process.cwd(), 'views'))
  app.set('view engine', 'njk')
  nunjucks.configure('views', { autoescape: true, express: app })

  // 设置 POST
  app.use(bodyParser.json({ limit: '1mb' }))
  app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }))

  // 让服务器能转发 PUT、DELETE 请求
  app.use(methodOverride())

  // 压缩数据
  app.use(compress())

  // Cookie
  app.use(cookieParser(session_secret))

  // Session
  app.use(sessionParser(session_secret!))

  // Passport
  passport.use(strategy)
  passport.serializeUser((user, done) => 
    done(null, user)
  )
  passport.deserializeUser((user, done) => 
    done(null, user)
  )
  app.use(passport.initialize())
  app.use(passport.session())


  // 自定义 Restful
  app.use(restful)

  // Controller
  app.use('/', corsHandler, controller)

  // api_v1
  app.use('/api/v1', corsHandler, api_v1)
  
  // Render Nuxt ...
  await nuxtReady()
  app.use(nuxtHandler, nuxt.render)

  // 404 Not Found.
  app.use('*', notFoundHandler)

  // 500 Error
  app.use(errorHandler)
  
  // Running Server ...
  http.createServer(app).listen(Port, Host, () => {
    logger.info(`Service running in %s environment, PORT: %d ...`, process.env.NODE_ENV || 'development', Port)
  })
}

start()