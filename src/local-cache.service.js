class LocalStorageClient {
    getItem(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        }catch(e) {
            console.error(e);
            return false;
        }
    }

    setItem(key, data) {
        try {
            return localStorage.setItem(key, JSON.stringify(data));
        }catch(e) {
            console.log(e);
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

class IndexedDBClient {
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
        cosole.log('close db', this.DB_NAME);
    }
}