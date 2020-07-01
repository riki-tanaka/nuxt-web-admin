import { Maps } from 'kenote-config-helper'
import { toPairs, isString } from 'lodash'

const operatorMaps = {
  // 大于
  ['$gt']: (a: number, b: number): boolean => a > b,
  // 小于
  ['$lt']: (a: number, b: number): boolean => a < b,
  // 大于等于
  ['$gte']: (a: number, b: number): boolean => a >= b,
  // 小于等于
  ['$lte']: (a: number, b: number): boolean => a <= b,
  // 包含
  ['$in']: (a: string | number, b: Array<string | number>): boolean => b.includes(a),
  // 不包含
  ['$nin']: (a: string | number, b: Array<string | number>): boolean => !b.includes(a),
  // 不等于
  ['$ne']: (a: string | number, b: string | number): boolean => a !== b,
  // 等于
  ['$eq']: (a: string | number, b: string | number): boolean => a === b,
  // 长度大于
  ['$size']: (a: never[], b: number) => a.length > b,
  // tslint:disable-next-line: no-eval
  ['$or']: (...result: boolean[]) => eval(result.map(String).join(' || ')),
  // tslint:disable-next-line: no-eval
  ['$and']: (...result: boolean[]) => eval(result.map(String).join(' && '))
}

/**
 * 规则判断
 * @param data 
 * @param query 
 */
export function ruleJudgment (data: Maps<any>, query: Maps<any>): boolean {
  let result: boolean[] = []
  for (let key in query) {
    if (['$and', '$or'].includes(key)) {
      result.push(ruleJudgmentByArray(data, query[key], key as '$and' | '$or'))
    }
    else {
      ruleJudgmentPush(data[key], query[key], result)
    }
  }
  return operatorMaps['$and'](...result)
}

function ruleJudgmentByArray (data: Maps<any>, query: Array<Maps<any>>, mode: '$and' | '$or' = '$and'): boolean {
  let result: boolean[] = []
  for (let item of query) {
    for (let key in item) {
      ruleJudgmentPush(data[key], item[key], result)
    }
  }
  return operatorMaps[mode](...result)
}

function ruleJudgmentPush (data: any, query: any, result: boolean[]): void {
  if (Object.prototype.toString.call(query) === '[object Object]') {
    for (let pairs of toPairs(query)) {
      let [ operator, value ] = pairs
      let _data = data
      if (isString(_data) && isDateString(_data)) {
        _data = new Date(_data).getTime()
      }
      if (value === '$now') {
        value = Date.now()
      }
      else if (isString(value) && isDateString(value)) {
        value = new Date(value).getTime()
      }
      result.push(operatorMaps[operator](_data, value))
    }
  }
  else {
    result.push(operatorMaps['$eq'](data, query))
  }
}

export function isDateString (value: string): boolean {
  let date = new Date(value)
  return String(date) === 'Invalid Date' ? false : true
}