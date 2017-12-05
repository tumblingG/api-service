(function(window, angular) {'use strict';
    const API_SERVER = 'http://localhost:8080';
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
    export const baseActions = {
        create: {
            method: 'POST'
        },
        get: {
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
        constructor($injector, $cacheFactory, $resource, $log, $window, localCache) {
            this.$injector = $injector;
            this.$cacheFactory = $cacheFactory;
            this.$resource = $resource;
            this.$log = $log;
            this.$window = $window;
            this.localCache = localCache
        }

        factory() {
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
                actionsToCache,
                cacheKey,
                cacheCapacity = 20
            } = this;

            if (!cacheKey) {
                throw 'need a cacheKey for $cacheFactory';
            }else {
                this.cacheKey = cacheKey;
                this.$log.debug(`resource cache key "${cacheKey}": for ${this.apiPath}`);
            }

            this._cache = this.$cacheFactory.get(this.cacheKey) || this.$cacheFactory(this.cacheKey, {capacity: cacheCapacity});

            let originalActions = this.getActions() || angular.merge({}, baseActions, actions);
            this._actions = this.decorateActions(originalActions);

            this._params = this.getParams() || angular.merge({}, baseParams, params);

            this._resource = this.resource(API_SERVER, this.apiPath, this._params, this._actions);

            if (angular.isArray(actionsToCache)) {
                let handler = {
                    get: (target, prop, receiver) => {
                        if (prop === 'cacheKey') {
                            return this.cacheKey;
                        }
                        let action;
                        if (action = this._findAction(prop)) {
                            if (Object.is(action.method, 'GET')) {
                                if (actionsToCache.includes(prop)) {
                                    return  this._cachedFn.bind(this, this._resource[prop])
                                }
                            }
                        }else {
                            throw 'do not has this method';
                        }
                    }
                }
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
            }else if (this.disableCacheArr) {
                Object.keys(actions).forEach(_k => {
                    if (this.disableCacheArray.indexOf(_k) === -1) {
                        actions[_k].cache = cache;
                    }
                });
            }else {
                Object.keys(actions).forEach(_k => actions[_k].cache = cache);
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
                if (this._actions.hasOwnPropery(_a)) {
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
                success = args[i] || angular.noop;
                fail = args[2] || angular.noop;
                localKey = this.getLocalStorageKey(args);
            }else if (angular.isFunction(args[0])) {
                params = {};
                success = args[0];
                fail = args[1];
                localKey = this.getLocalStorageKey();
            }else {
                //call orgin function
                return originFn.apply(null, args);
            }

            // return $promise: this.localCache
        }
    }

    ApiService.$inject = [
        '$injector',
        '$cacheFactory',
        '$resource',
        '$log',
        '$window',
        '$q',
        'localCache'
    ];

})(window, window.angular);