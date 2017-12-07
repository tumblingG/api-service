(function(window, angular) {'use strict';
    /**
     * @decorator
     * @param configs
     * @returns {Function}
     */
    function ResourceParams(configs) {
        return function (target) {
            Object.assign(target.prototype, configs);
        }
    }

    /**
     * base defaultParams
     * @type {{id: string, action: string, config: string}}
     */
    const baseParams = {
        id: '@id',
        action: '@action',
        config: '@config'
    };

    /**
     * base default actions
     * @type {{create: {method: string}, get: {method: string}, getAll: {method: string, isArray: boolean}, update: {method: string}, delete: {method: string}}}
     * @return {object}
     */
    const baseActions = {
        create: {
            method: 'POST'
        },
        get: {
            method: 'GET'
        },
        list: {
            method: 'GET'
        },
        getAll: {
            method: 'GET',
            isArray: true
        },
        update: {
            method: 'PUT'
        },
        delete: {
            method: 'DELETE'
        }
    };

    class ApiService {
        constructor($cacheFactory, $resource, $log, $q, localCacheService) {
            this.$cacheFactory = $cacheFactory;
            this.$resource = $resource;
            this.$log = $log;
            this.$q = $q;
            this.localCacheService = localCacheService;
            return this.apiFactory();
        }

        apiFactory() {
            if (angular.isUndefined(this.apiPath)) {
                throw 'must provide a api path to create a client request';
            }

            /**
             *
             * params: default params
             * actions: actions
             * actions: actions which need to cache
             * cacheKey: used for $cacheFactory
             * cacheCapacity: used for $cacheFactory
             */
            let {
                params = {},
                actions = {},
                actionsToLocalCache,
                cacheKey,
                cacheCapacity = 20,
                identity
            } = this;

            if (!cacheKey) {
                this.cacheKey = this.apiPath;
            }
            this.$log.debug(`resource cache key "${cacheKey}": for ${this.apiPath}`);

            this._cache = this.$cacheFactory.get(this.cacheKey) || this.$cacheFactory(this.cacheKey, {capacity: cacheCapacity});

            let originalActions = this.getActions() || angular.merge({}, baseActions, actions);
            this._actions = this.decorateActions(originalActions);

            this._params = this.getParams() || angular.merge({}, baseParams, params);

            this._resource = this.resource(this.localCacheService.getApi(), this.apiPath, this._params, this._actions);

            if (angular.isArray(actionsToLocalCache)) {
                let handler = {
                    get: (target, prop, receiver) => {
                        if (prop === 'cacheKey') {
                            return this.cacheKey;
                        }
                        let action;
                        if (action = this._findAction(prop)) {
                            if (Object.is(action.method, 'GET')) {
                                if (actionsToLocalCache.includes(prop)) {
                                    return  this._cachedFn.bind(this, this._resource[prop])
                                }else {
                                    return this._resource[prop];
                                }
                            }else {
                                return (...args) => {
                                    return {
                                        $promise: this._resource[prop].apply(null, args).$promise.then(res => {
                                            this.localCacheService.clearFuzzyMatch(this._prefixLocalStorageKey());
                                            return res;
                                        }).catch(err => {throw err;})
                                    };
                                }
                            }
                        }else {
                            throw `do not has ${action.method} method`;
                        }
                    }
                };
                return new Proxy({}, handler);
            }else {
                return this._resource;
            }
        }

        /**
         * @abstract
         * @description provide actions
         */
        getActions() {
        }

        /**
         * @abstract
         * @description provide params
         */
        getParams() {
        }

        /**
         * @description add cache property
         * @param actions
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
            let decorateQueue = [this._addCacheToAction, this._addUpdatedCachesProp];
            decorateQueue.reduce((actions, fn) => {
                fn.call(this, actions);
            }, actions);
            return actions;
        }

        /**
         *
         * @param actions
         * @returns {decorated actions}
         * @private
         */
        _addCacheToAction(actions) {
            let cache = this._cache;
            if (this.disableCache || !cache) {
                //do nothing
            }else if (this.actionsToCache) {
                if (!Array.isArray(this.actionsToCache)) {
                    throw 'actionsToCache must be an array.'
                }
                Object.keys(actions).forEach(_k => {
                    if (this.actionsToCache.indexOf(_k) !== -1) {
                        if (actions[_k].method === 'GET') {
                            actions[_k].cache = cache;
                        }
                    }
                });
            }else {
                Object.keys(actions).forEach(_k => {
                    if (actions[_k].method === 'GET') {
                        actions[_k].cache = cache;
                    }
                });
            }
            return actions;
        }

        /**
         *
         * @param actions
         * @returns {decorated actions}
         * @private
         */
        _addUpdatedCachesProp(actions) {
            let updatedCacheArr = this.updatedCacheArr;
            if (angular.isArray(updatedCacheArr)) {
                Object.keys(actions).forEach(_k => actions[_k].updatedCacheArr = updatedCacheArr);
            }
            return actions;
        }

        /**
         *
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
         *
         * @param name
         * @returns {Object}
         * @private
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

        _cachedFn(originFn, ...args) {
            let localKey, params, success, fail;
            if (angular.isObject(args[0])) {
                params = args[0];
                success = args[1] || angular.noop;
                fail = args[2] || angular.noop;
                localKey = this._getLocalStorageKey(args);
            }else if (angular.isFunction(args[0])) {
                params = {};
                success = args[0];
                fail = args[1] || angular.noop;
                localKey = this._getLocalStorageKey();
            }else {
                params = {};
                success = angular.noop;
                fail = angular.noop;
                localKey = this._getLocalStorageKey();
            }

             return {
                 $promise: this.localCacheService.getItem(localKey).then(res => {
                     debugger;
                    if (res) {
                        this.$log.debug(`${this._getLocalStorageKey()}: load from local`);
                        return this.$q.resolve(res).then(res => {
                            return success(res) || res;
                        }).catch(err => {
                            throw fail(err) || err;
                        });
                    }else {
                        return originFn.apply(null, [params]).$promise.then(res => {
                            this.localCacheService.setItem(localKey, res);
                            return success(res) || res;
                        }).catch(err => {
                            throw fail(err) || err;
                        })
                    }
                 }, err => this.$log.debug(err))
             }
        }

        _getLocalStorageKey(args) {             
            let localStorageKey = ((this.cacheKey + '_' + this.apiPath + '_') + (this.identity ? this.identity + '_' : '') + (args ? angular.toJson(args[0]) : ''));
            this.$log.debug(localStorageKey);
            return localStorageKey;
        }

        _prefixLocalStorageKey () {
            let prefixlocalStorageKey = ((this.cacheKey + '_' + this.apiPath + '_') + (this.identity ? this.identity: '') );
            return prefixlocalStorageKey;
        }
    }

    ApiService.$inject = [
        '$cacheFactory',
        '$resource',
        '$log',
        '$q',
        'localCacheService'
    ];

    exports.ResourceParams = ResourceParams;
    exports.ApiService = ApiService;

})(window, window.angular || require('angular'));