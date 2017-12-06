class localCacheService {
    DB_NAME = 'MY_CLIENT_DB';
    DB_VERSION = 1;
    DB_STORE_NAME = ['HTTP_REQUEST_CACHE'];
    DB_TYPE = 'localStorage';
    API_SERVER = 'http://localhost:8080';
    
    constructor() {}

    setConfig(config) {
        this.DB_NAME = config.DB_NAME || 'MY_CLIENT_DB';
        this.DB_VERSION = config.DB_VERSION || 1;
        this.DB_STORE_NAME = config.DB_STORE_NAME ? [config.DB_STORE_NAME] : ['HTTP_REQUEST_CACHE'];
        this.DB_TYPE = config.DB_TYPE || 'localStorage';
        this.API_SERVER = config.API_SERVER || 'http://localhost:8080';
    }

    $get = ['$q', $q => {
        let DB_TYPE = this.DB_TYPE;
        let API_SERVER = this.API_SERVER
        let client = DB_TYPE === 'localStorage' ? new LocalStorageClient() :
            new IndexedDBClient(this.DB_NAME, this.DB_VERSION, this.DB_STORE_NAME).initDB();
        return {
            getApi: function() {
                return API_SERVER;
            },
            setItem: function(key, data) {
                switch (DB_TYPE) {
                    case 'localStorage':
                        return $q.resolve(client.setItem(key, data));
                    case 'indexedDB':
                        let deferred = $q.defer();
                        client.setItem(key, data, e => deferred.resolve(e.target.result), e => deferred.reject(e.target.error.message));
                        return deferred.promise;
                    default:
                        break;
                }
            },
            getItem: function(key) {
                switch (DB_TYPE) {
                    case 'localStorage':
                        return $q.resolve(client.getItem(key));
                    case 'indexedDB':
                        let deferred = $q.defer();
                        client.getItem(key, e => deferred.resolve(e.target.result), e => deferred.reject(e.target.error.message));
                        return deferred.promise;
                    default:
                        break;
                }
            },
            removeItem: function(key) {
                switch(DB_TYPE) {
                    case 'localStorage':
                        return $q.resolve(client.removeItem(key));
                    case 'indexedDB':
                        let deferred = $q.defer();
                        client.removeItem(key, e => deferred.resolve(e.target.result), e => deferred.reject(e.target.error.message));
                        return deferred.promise;
                    default:
                        break;
                }
            },
            clear: function() {
                switch (DB_TYPE) {
                    case 'localStorage':
                        return $q.resolve(client.clear());
                    case 'indexedDB':
                        let deferred = $q.defer();
                        client.clear(e => deferred.resolve(e.target.result), e => deferred.reject(e.target.error.message));
                        return deferred.promise;
                    default:
                        break;
                }
            },
            clearFuzzyMatch: function(key) {
                switch (DB_TYPE) {
                    case 'localStorage':
                        return client.removeFuzzyMatch(key);
                    case 'indexedDB':
                        return client.removeFuzzyMatch(key, e => {
                            console.log(e.target.result);
                        }, e => {
                            console.error(e.target.error.message);
                        });
                    default:
                        break;
                }
            },
            deleteDB: function() {
                switch (DB_TYPE) {
                    case 'indexedDB':
                        client.deleteDB();
                        break;
                    default:
                        window.alert('only indexedDB has deleteDB() method');
                        break;
                }
            },
            closeDB: function() {
                switch (DB_TYPE) {
                    case 'indexedDB':
                        client.closeDB();
                        break;
                    default:
                        window.alert('only indexedDB has closeDB() method');
                        break;
                }
            }
        };
    }]
}

class LocalStorageClient {
    constructor() {
        if (!window.localStorage) {
            this._localStorageFactory();
        }
    }

    setItem(key, data) {
        try {
            return localStorage.setItem(key, JSON.stringify(data));
        }catch(e) {
            console.log(e);
        }
    }

    getItem(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        }catch(e) {
            console.error(e);
            return false;
        }
    }

    removeItem(key) {
        return localStorage.removeItem(key);
    }

    removeFuzzyMatch(key) {
        let len = localStorage.length, _key, toDeleteKeys = [];

        for (let _i = 0; _i < len; _i++) {
            _key = localStorage.key(_i);
            if (_key.startsWith(key)) {
                toDeleteKeys.push(_key);
            }
        }

        toDeleteKeys.forEach(_tdk => {
            this.removeItem(_tdk);
        });
        return true;
    }

    clear() {
        return localStorage.clear();
    }

    _localStorageFactory() {
        Object.defineProperty(window, "localStorage", new (function () {
            var aKeys = [], oStorage = {};
            Object.defineProperty(oStorage, "getItem", {
                value: function (sKey) { return sKey ? this[sKey] : null; },
                writable: false,
                configurable: false,
                enumerable: false
            });
            Object.defineProperty(oStorage, "key", {
                value: function (nKeyId) { return aKeys[nKeyId]; },
                writable: false,
                configurable: false,
                enumerable: false
            });
            Object.defineProperty(oStorage, "setItem", {
                value: function (sKey, sValue) {
                    if(!sKey) { return; }
                    document.cookie = escape(sKey) + "=" + escape(sValue) + "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/";
                },
                writable: false,
                configurable: false,
                enumerable: false
            });
            Object.defineProperty(oStorage, "length", {
                get: function () { return aKeys.length; },
                configurable: false,
                enumerable: false
            });
            Object.defineProperty(oStorage, "removeItem", {
                value: function (sKey) {
                    if(!sKey) { return; }
                    document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
                },
                writable: false,
                configurable: false,
                enumerable: false
            });
            Object.defineProperty(oStorage, "clear", {
                value: function () {
                    if(!aKeys.length) { return; }
                    for (var sKey in aKeys) {
                        document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
                    }
                },
                writable: false,
                configurable: false,
                enumerable: false
            });
            this.get = function () {
                var iThisIndx;
                for (var sKey in oStorage) {
                    iThisIndx = aKeys.indexOf(sKey);
                    if (iThisIndx === -1) { oStorage.setItem(sKey, oStorage[sKey]); }
                    else { aKeys.splice(iThisIndx, 1); }
                    delete oStorage[sKey];
                }
                for (aKeys; aKeys.length > 0; aKeys.splice(0, 1)) { oStorage.removeItem(aKeys[0]); }
                for (var aCouple, iKey, nIdx = 0, aCouples = document.cookie.split(/\s*;\s*/); nIdx < aCouples.length; nIdx++) {
                    aCouple = aCouples[nIdx].split(/\s*=\s*/);
                    if (aCouple.length > 1) {
                        oStorage[iKey = unescape(aCouple[0])] = unescape(aCouple[1]);
                        aKeys.push(iKey);
                    }
                }
                return oStorage;
            };
            this.configurable = false;
            this.enumerable = true;
        })());
    }
}

class IndexedDBClient {
    constructor(DB_NAME, DB_VERSION, DB_STORE_NAME) {
        this.DB_NAME = DB_NAME;
        this.DB_VERSION = DB_VERSION;
        this.DB_STORE_NAME = DB_STORE_NAME;
        this.SN = this.DB_STORE_NAME[0];
    }

    initDB() {
        if (!window.indexedDB) {
            window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
            return ;
        }
        let request  = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);
        request.onsuccess = e => {
            this.db = e.target.result;
            this.db.onerror = event => {
                console.error('Database error: ' + event.target.errorCode);
            }
            console.log('init db success', e.target.result);
        };
        request.onerror = e => {
            console.error('init db failed', e.target.error.message);
        };
        request.onupgradeneeded = e => {
            console.log('onupgradeneeded');
            this.DB_STORE_NAME.forEach(name => {
                e.target.result.createObjectStore(name);
                console.log('create object store:', name);
            });
        };
        return this;
    }

    setItem(key, data, success, fail) {
        let transaction = this.db.transaction(this.DB_STORE_NAME, 'readwrite');
        let objectStore = transaction.objectStore(this.SN);
        let request = objectStore.put(data, key);
        request.onsuccess = success;
        request.onerror = fail;
    }

    getItem(key, success, fail) {
        let transaction = this.db.transaction(this.DB_STORE_NAME);
        let objectStore = transaction.objectStore(this.SN);
        let request = objectStore.get(key);
        request.onsuccess = success;
        request.onerror = fail;
    }

    removeItem(key, success, fail) {
        let transaction = this.db.transaction(this.DB_STORE_NAME, 'readwrite');
        let objectStore = transaction.objectStore(this.SN);
        let request = objectStore.delete(key);
        request.onsuccess = success;
        request.onerror = fail;
    }

    removeFuzzyMatch(key, success, fail) {
        let transaction = this.db.transaction(this.DB_STORE_NAME, 'readwrite');
        let objectStore = transaction.objectStore(this.SN);
        let request = objectStore.getAllKeys();
        request.onsuccess = e => {
            let toDeleteKeys = [];
            let _keys = e.target.result;
            _keys.forEach(_key => {
                if (_key.startsWith(key)) {
                    toDeleteKeys.push(_key);
                }
            });

            toDeleteKeys.forEach(_tdk => {
                this.removeItem(_tdk, success, fail);
            });

        }
        request.onerror = e => {
            console.error('db get keys failed', e.target.error.message);
        }

    }

    clear(success, fail) {
        let transaction = this.db.transaction(this.DB_STORE_NAME);
        let objectStore = transaction.objectStore(this.SN);
        let request = objectStore.clear();
        request.onsuccess = success;
        request.onerror = fail;
    }

    deleteDB() {
        window.indexedDB.deleteDatabase(this.DB_NAME);
        console.log('delete db', this.DB_NAME);
    }

    closeDB() {
        this.db.close();
        console.log('close db', this.DB_NAME);
    }
}

module.exports = localCacheService;

