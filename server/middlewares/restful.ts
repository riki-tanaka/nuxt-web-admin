import { Middleware, Action, Context, Property } from '@kenote/core'
import { HttpError } from 'http-errors'
import * as service from '~/services'
import { setJwToken, verifyJwToken, toUser } from './auth'
import { UserDocument } from '@/types/services/db'
import fs from 'fs'
import path from 'path'
import { loadConfig } from '@kenote/config'
import { ServerConfigure } from '@/types/config'
import ruleJudgment from 'rule-judgment'
import { merge } from 'lodash'

@Middleware({
  // HTTP 头信息
  headers: {}
})
export default class Restful {

  /**
   * 绑定一个方法
   */
  @Action()
  notfound (ctx: Context) {
    return async () => {
      await ctx.status(404)
    }
  }

  /**
   * 绑定一个方法；并指定名称为 api
   */
  @Action('api')
  api (ctx: Context) {
    return (info: any, error?: HttpError) => {
      if (error) {
        let { message } = error
        ctx.service.apilog({ error: message }, ctx)
        ctx.json({ error: message })
      }
      else {
        ctx.service.apilog({ data: JSON.stringify(info, null, 2) }, ctx)
        ctx.json({ data: info })
      }
    }
  }

  /**
   * 过滤用户等级
   */
  @Action('filterUserLevel')
  filterUserLevel (ctx: Context) {
    return (level: number, minLevel: number) => {
      let { ErrorCode, httpError } = service
      let authLevel = ctx.user?.group.level ?? 0
      if (authLevel === 9999) return
      if (authLevel < minLevel) {
        throw httpError(ErrorCode.ERROR_ONLY_ADVANCED_ADMIN)
      }
      if (level >= authLevel) {
        throw httpError(ErrorCode.ERROR_BYLOND_LEVEL_OPERATE)
      }
    }
  }

  /**
   * 调用 Services 接口
   */
  @Property()
  service (ctx: Context) {
    return service
  }

  /**
   * 调用 DB 接口
   */
  @Property()
  db (ctx: Context) {
    return service.db
  }

  /**
   * 获取 JWT Token
   */
  @Property()
  jwToken (ctx: Context) {
    return ctx.headers.authorization?.replace(/^(Bearer)\s{1}/, '')
  }

  /**
   * 获取 JWT 用户
   */
  @Action()
  jwtUser (ctx: Context) {
    return async () => {
      let payload = verifyJwToken(ctx.jwToken)
      if (payload) {
        let user = await ctx.db.user.Dao.findOne({ _id: payload._id, jw_token: ctx.jwToken })
        return toUser(user)
      }
      return null
    }
  }

  /**
   * 设置 JWT Token
   */
  @Action()
  setJwToken (ctx: Context) {
    return setJwToken
  }

  /**
   * JET 登录
   */
  @Action()
  jwtLogin (ctx: Context) {
    return async (user: UserDocument) => {
      let jwtoken = ctx.setJwToken({ _id: user._id })
      ctx.cookie('jwtoken', jwtoken)
      await service.db.user.Dao.updateOne({ _id: user._id }, { jw_token: jwtoken })
      return toUser(merge(user, { jw_token: jwtoken }))
    }
  }

  /**
   * 下载文件 
   */
  @Action()
  downloadFile (ctx: Context) {
    return (filePath: string) => {
      if (!fs.existsSync(filePath)) {
        return ctx.notfound()
      }
      let fileStream = fs.readFileSync(filePath)
      let extname = path.extname(filePath)
      let { previewTypes } = loadConfig<ServerConfigure>('config/server', { mode: 'merge' })
      let contentType = previewTypes?.find( ruleJudgment({ extname: { $_in: extname } }) )?.type ?? 'application/octet-stream'
      ctx.setHeader('Content-Type', contentType)
      return ctx.send(fileStream)
    }
  }
}

// 扩展到 @kenote/core 中 Context 类型
declare module '@kenote/core' {
  interface Context {
    /**
     * 返回 Not Found.
     */
    notfound (): Promise<void>
    /**
     * 调用 API 出口
     * @param info 
     * @param error 
     */
    api (info: any, error?: Error): void
    /**
     * 过滤用户等级
     */
    filterUserLevel (level: number, minLevel: number): void
    /**
     * 调用 Services 接口
     */
    service: typeof service
    /**
     * 调用 DB 接口
     */
    db: typeof service.db
    /**
     * 获取 JWT Token
     */
    jwToken: string
    /**
     * 获取 JWT 用户
     */
    jwtUser (): Promise<UserDocument | null>
    /**
     * 设置 JWT Token
     */
    setJwToken: typeof setJwToken
    /**
     * JET 登录
     */
    jwtLogin (user: UserDocument): Promise<UserDocument>
    /**
     * 下载文件
     */
     downloadFile (filePath: string): Context
  }
}