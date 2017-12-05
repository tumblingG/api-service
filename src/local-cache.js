/*
 * only localStorage is available for now
 * */
export class localCache {
    DB_NAME = 'TYPHOON.SZT.COM';
    DB_VERSION = 1;
    DB_STORE_NAME = ['HTTP_REQUEST_CACHE'];
    DB_TYPE = 'localStorage';

    constructor() {
    }

    $get = ['$q', ($q) => {

        let DB_TYPE = this.DB_TYPE;
        let client = DB_TYPE === 'localStorage'
            ? new LocalStorageClient()
            : new IndexedDBClient(this.DB_NAME, this.DB_VERSION, this.DB_STORE_NAME).initDB();

        return {
            setItem(key, data){
                switch (DB_TYPE) {
                    case 'localStorage':
                        return $q.resolve(client.setItem(key, data));
                    case 'indexedDB':
                        let deferred = $q.defer();
                        client.setItem(key, data, e => deferred.resolve(e.target.result), e => deferred.reject(e.target.error.message));
                        return deferred.promise;
                }
            },
            getItem(key){
                switch (DB_TYPE) {
                    case 'localStorage':
                        return $q.resolve(client.getItem(key));
                    case 'indexedDB':
                        let deferred = $q.defer();
                        client.getItem(key, e => deferred.resolve(e.target.result), e => deferred.reject(e.target.error.message));
                        return deferred.promise;
                }
            },
            clear(key){
                switch (DB_TYPE) {
                    case 'localStorage':
                        return client.clear(key);
                }
            },
            //模糊匹配key做删除
            clearFuzzyMatch(key){
                switch (DB_TYPE) {
                    case 'localStorage':
                        return client.clearFuzzyMatch(key);
                }
            }
        }
    }];

}
export class LocalStorageClient {
    getItem(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        }
        catch (e) {
            console.error(e);
            return false;
        }
    }

    setItem(key, data) {
        try {
            return localStorage.setItem(key, JSON.stringify(data));
        }
        catch (e) {
            console.error(e);
        }
    }

    clear(key) {
        localStorage.removeItem(key);
    }

    clearFuzzyMatch(key) {

        let len = localStorage.length, _key, toDeleteKeys = [];

        for (let _i = 0; _i < len; _i++) {
            _key = localStorage.key(_i);
            if (_key.startsWith(key)) {
                toDeleteKeys.push(_key);
            }
        }

        toDeleteKeys.forEach(_tdk => {
            this.clear(_tdk);
        });

    }
}
export class IndexedDBClient {
    constructor(DB_NAME, DB_VERSION, DB_STORE_NAME) {
        this.DB_NAME = DB_NAME;
        this.DB_VERSION = DB_VERSION;
        this.DB_STORE_NAME = DB_STORE_NAME;
        this.SN = this.DB_STORE_NAME[0];
    }

    initDB() {
        let req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        req.onsuccess = e => {
            this.db = e.target.result;
            console.log('init db success', e.target.result);
        };
        req.onerror = e => {
            console.log('init db failed', e.target.error.message);
        };
        req.onupgradeneeded = e => {
            console.log('onupgradeneeded');
            this.DB_STORE_NAME.forEach(name => {
                e.target.result.createObjectStore(name);
                console.log('create object store:', name);
            });
        };
        return this;
    }

    setItem(key, data, success, fail) {
        let store = this.db.transaction(this.SN, 'readwrite').objectStore(this.SN);
        let req = store.add(data, key);
        req.onsuccess = success;
        req.onerror = fail;
    }

    getItem(key, success, fail) {
        let store = this.db.transaction(this.SN).objectStore(this.SN);
        let req = store.get(key);
        req.onsuccess = success;
        req.onerror = fail;
    }

    getItems(sn, key) {
        let res = [];
        let req = this.db.transaction(sn).objectStore(sn).openCursor(IDBKeyRange.only(key));
        req.onsuccess = e => {
            let cursor = e.target.result;
            if (cursor) {
                res.push(cursor.value);
                cursor.continue();
            }
        }
    }

    deleteDB() {
        indexedDB.deleteDatabase(this.DB_NAME);
        console.log('delete db', this.DB_NAME);
    }

    closeDB() {
        this.db.close();
        console.log('close db', this.DB_NAME);
    }
}
