(function(window, angular) {
    var localCacheService = require('./local-cache.service');
    angular.module('api.service', ['ngResource'])
        .provider('localCacheService', localCacheService);
})(window, window.angular);