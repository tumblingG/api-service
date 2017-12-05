import angular from 'angular';
import {API_SERVER} from '../service/constant.service';
import {injectHelper} from './inject-helper';

export const baseParams = {
    id: '@id',
    action: '@action',
    config: '@config'
};

export const baseActions = {
    all: {
        method: 'GET'
    },
    list: {
        method: 'GET'
    },
    create: {
        method: 'POST'
    },
    view: {
        method: 'GET'
    },
    update: {
        method: 'PUT'
    },
    delete: {
        method: 'DELETE',
        isArray: true
    }
};

/**
 * @decorator
 * @param value
 * @returns {Function}
 */
export function ResourceParams(value) {
    return function (target) {
        Object.assign(target.prototype, value);
    }
}
/**
 * @class
 * @description this class extended by api
 * @example
 * @ResourceParams({
 *   apiPath: '/api/dict/repository/:action/:id',
 * })
 * export class DictRepositoryApi extends RestClient {}
 */
export class RestClient {

    /**
     * @constructs
     * @param $injector
     * @returns {$resource|Proxy}
     */
    constructor($injector) {

        this.$injector = $injector;

        injectHelper.call(this, $injector, ['$cacheFactory', '$resource', '$log', '$window', '$q', 'localCache']);

        //apiPath is required to build a rest client
        if (angular.isUndefined(this.apiPath)) {
            return this.$log.debug('must provide a api path to create a rest client');
        }

        let {
            params = {}, //see baseParams
            actions = {}, //see baseActions
            actionsToCache,//actions need local storage support ['list']
            cacheKey,//used for $cacheFactory
            cacheCapacity = 20,//used for $cacheFactory
        } = this;

        try {
            if (!cacheKey) {
                //this.apiPath = '/api/companies/:id' => cacheKey = "companies"
                cacheKey = /^\/api\/(.*?)\//.exec(this.apiPath)[1];
            }
        }
        catch (e) {
        }
        this.$log.debug(`resource cache key "${cacheKey}": for ${this.apiPath}`);

        this.cacheKey = cacheKey;
        //一个Cache实例，具有put(key,value), get(key),remove(key),removeAll(),destroy(),info()方法
        this._cache = this.$cacheFactory.get(this.cacheKey) || this.$cacheFactory(this.cacheKey, {capacity: cacheCapacity});

        let originalActions = this.getActions() || angular.merge({}, baseActions, actions);
        this._actions = this.decorateActions(originalActions);

        this._params = this.getParams() || angular.merge({}, baseParams, params);

        //_resource:一个$resource类
        this._resource = this.resource(API_SERVER, this.apiPath, this._params, this._actions);

        if (angular.isArray(actionsToCache)) {
            let handler = {
                get: (target, prop, receiver) => {
                    if (prop === 'cacheKey') {
                        return this.cacheKey;
                    }
                    let action;
                    //找出为prop名字的action
                    if (action = this._findAction(prop)) {
                        //get method can use cache
                        if (Object.is(action.method, 'GET')) {
                            //需要缓存的方法放在actionsToCache里
                            if (actionsToCache.includes(prop)) {
                                //如果有则从缓存读取，缓存没有则发送请求，返回数据会被缓存
                                return this._cachedFn.bind(this, this._resource[prop]);
                            }
                            else {
                                return this._resource[prop];
                            }
                        }
                        //post, put, delete clear cache
                        else {
                            return (...args) => {
                                return {
                                    $promise: this._resource[prop].apply(null, args).$promise.then(res => {
                                        this.localCache.clearFuzzyMatch(this.cacheKey);
                                        return res;
                                    }).catch(err => {
                                        throw err;
                                    })
                                };
                            }
                        }
                    }
                }
            };
            return new Proxy({}, handler);
        }
        else {
            return this._resource;
        }

    }

    /**
     * @private
     * @param name
     * @returns {Object}
     */
    _findAction(name) {
        for (let _a in this._actions) {
            if (this._actions.hasOwnProperty(_a)) {
                if (_a === name) {
                    return this._actions[_a];
                }
            }
        }
    }

    /**
     * @param serverPath
     * @param apiPath
     * @param params
     * @param actions
     * @returns {$resource}
     */
    resource(serverPath, apiPath, params, actions) {
        return this.$resource(serverPath + apiPath, params, actions);
    }

    /**
     * @description add cache property
     * @param actions
     * @param cache
     * @returns {Object}
     * @example
     * list:   {
     *  method: 'GET'
     * }
     * =>
     * list:   {
     *  method: 'GET',
     *  cache: cacheInstance
     * }
     */
    decorateActions(actions) {
        let decorateQueue = [this.addCacheToAction, this.addToBeUpdatedCachesProp];
        decorateQueue.reduce((actions, fn) => fn.call(this, actions), actions);
        return actions;
    }

    addCacheToAction(actions) {
        let cache = this._cache;
        if (this.disableCache || !cache) {
            return actions;
        }else if (this.disableCacheArray) {
            Object.keys(actions).forEach(_k => {
                if(this.disableCacheArray.indexOf(_k) !== -1) {
                    actions[_k].cache = undefined;
                }else {
                    actions[_k].cache = cache
                }

            });
            return actions;
        }

        Object.keys(actions).forEach(_k => actions[_k].cache = cache);
        return actions;
    }

    addToBeUpdatedCachesProp(actions) {
        let toBeUpdatedCaches = this.toBeUpdatedCaches;
        if (angular.isArray(toBeUpdatedCaches)) {
            Object.keys(actions).forEach(_k => actions[_k].toBeUpdatedCaches = toBeUpdatedCaches)
        }
        return actions;
    }

    /**
     * @abstract
     * @description provide params
     */
    getParams() {
    }

    getLocalStorageKey(args) {
        let localStorageKey = ((this.cacheKey + '_' + this.$injector.get('AuthService').getIdentity().username + '_' + this.apiPath + '_') + (args ? angular.toJson(args[0]) : ''));
        this.$log.debug(localStorageKey);
        return localStorageKey;
    }

    /**
     * @abstract
     * @description provide actions
     */
    getActions() {
    }

    /**
     * @param originFn {Function} - method of $resource instance
     * @param args
     * @returns {Object} - object with $promise property
     * @description check local cache before sending request to server, return cache if found, otherwise send request to server and set response data to local
     * @private
     */
    _cachedFn(originFn, ...args) {
        let localKey, params, success, fail;
        //$resource can be called in several ways, please reference https://docs.angularjs.org/api/ngResource/service/$resource,
        //in this internal project, let's just consider these two conditions
        //1.action(params, success, error)
        //2.action(success, error)
        //in some case, first argument can be success callback, if it's object, treat it as request parameters
        if (angular.isObject(args[0])) {
            params = args[0];
            success = args[1] || angular.noop;
            fail = args[2] || angular.noop;
            localKey = this.getLocalStorageKey(args);
        }
        else if (angular.isFunction(args[0])) {
            params = {};
            success = args[0];
            fail = args[1] || angular.noop;
            localKey = this.getLocalStorageKey();
        }
        else {
            //call origin function
            return originFn.apply(null, args);
        }
        //get cached data from localCache service
        return {
            //make it compatible with $ngResource
            $promise: this.localCache.getItem(localKey).then(res => {

                //local data is found
                if (res) {
                    this.$log.debug(`${this.getLocalStorageKey()}: load from local`);
                    return this.$q.resolve(res).then(res => {
                        return success(res) || res;
                    }).catch(err => {
                        throw fail(err) || err;
                    });
                }
                //local data is not found, get from server
                else {
                    return originFn.apply(null, [params]).$promise.then(res => {
                        this.localCache.setItem(localKey, res);
                        return success(res) || res;
                    }).catch(err => {
                        throw fail(err) || err;
                    });

                }
            }, err => this.$log.debug(err))
        }
    }
}

RestClient.$inject = ['$injector'];

