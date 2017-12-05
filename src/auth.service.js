import { LOCAL_CACHE_TOKEN_NAME } from './constant.service';

export class AuthService {

    //当前账号拥有的权限
    accountPermissions;

    //admin账号的权限
    adminPermission = 'admin';

    //所有账号都有的权限
    basicPermissions = ['home', 'help'];

    constructor(SessionService, $rootScope, $q, SignInApi, localCache, IdentityApi, $state) {
        this.SessionService = SessionService;
        this.$rootScope = $rootScope;
        this.$q = $q;
        this.SignInApi = SignInApi;
        this.localCache = localCache;
        this.IdentityApi = IdentityApi;
        this.$state = $state;
        this._identity = undefined;
        this._token = undefined;
        this.load();
    }

    initPermissions() {
        let permissions = this._identity.permission_keys;
        if (this._identity.is_admin) permissions.push(this.adminPermission);
        this.accountPermissions = [...permissions, ...this.basicPermissions];
    }

    //目前一个模块对应一个权限, 如果以后对应多个权限, 需要修改这个函数
    hasAccessTo(permission) {
        if (angular.isUndefined(permission) || this._identity.is_admin){
            return true;
        }

        if (!this.accountPermissions) this.initPermissions();
        return this.accountPermissions.indexOf(permission) !== -1;
    }

    setToken(token, remember) {
        this._token = token;
        this.SessionService.setToken(token);
        if (remember) {
            this.localCache.setItem(LOCAL_CACHE_TOKEN_NAME, this._token);
        }
    }

    getToken() {
        return this._token;
    }

    setIdentity(identity) {
        this.$rootScope.identity = this._identity = identity;
    }

    getIdentity() {
        return this._identity;
    }

    isIdentityResolved() {
        return !!this._identity;
    }

    authenticate(data) {
        return this.SignInApi.create(data).$promise.then(res => {
            this.setToken(res.access_token, data.$remember);
            return this.identity();
        })
    }

    identity(force) {

        let deferred = this.$q.defer();

        if (force === true) this._identity = undefined;

        if (this._identity) {
            deferred.resolve(this._identity);
        }

        else if (this.getToken()) {
            this.IdentityApi.list({id: 'self'}, identity => {
                this.setIdentity(identity);
                deferred.resolve(identity);
            }, error => {
                this.setIdentity(undefined);
                deferred.reject(error);
            });
        }
        else {
            this.setIdentity(undefined);
            deferred.reject('need accessToken to get user info');
        }

        return deferred.promise;
    }

    load() {
        if (this.SessionService.getToken()) {
            this._token = this.SessionService.getToken();
        }
        else {
            this.localCache.getItem(LOCAL_CACHE_TOKEN_NAME).then(token => {
                this._token = token;
            });
        }
    }

    logout() {
        this._token = undefined;
        this._identity = undefined;
        this.$rootScope.identity = undefined;
        //set in CacheExpireService
        this.$rootScope.checkedDictTimeInThisSession = undefined;
        this.SessionService.clearToken();
        // this.localCache.clearAll();
        this.$state.go('signIn').then(() => {
            window.location.reload();
        });
    }

    clearCache() {
        window.localStorage.clear();
        window.location.reload();
    }
}
AuthService.$inject = ['SessionService', '$rootScope', '$q', 'SignInApi', 'localCache', 'IdentityApi', '$state'];