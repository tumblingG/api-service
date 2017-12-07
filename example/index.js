let  { apiModule, ResourceParams, ApiService} = require('../index');

@ResourceParams({
    apiPath: '/app/:aa/:gg',
    actionsToLocalCache: ['get'],
    cacheKey: 'app.css',
    identity: '123'
    // disableCache: true
    // actionsToCache: ['get']
})
class Api extends ApiService{}

var app = angular.module('app', [apiModule])
    .config(['localCacheServiceProvider', '$logProvider', function(localCacheServiceProvider, $logProvider){
    localCacheServiceProvider.setConfig({
        API_SERVER: 'http://localhost:8888',
        DB_TYPE: 'indexedDB'
    });
    $logProvider.debugEnabled(true);
}]);

app.service('Api', Api);

app.controller('myCtrl', ['$scope','Api', function($scope, Api) {
    console.log(Api.cacheKey);
    $scope.create = function() {
        Api.create({id:123 , actions: 'create'}, (res) => {
            $scope.code = angular.toJson(res, true);
        });
    };

    $scope.get = function() {
        Api.get({id:123, actions: 'get'}).$promise.then(res => {
            $scope.code = angular.toJson(res, true);
        });
    };

    $scope.list = function() {
        Api.list({id:123, actions: 'list'}).$promise.then(res => {
            $scope.code = angular.toJson(res, true);
        });
    };

    $scope.getAll = function() {
        Api.getAll({id:123 , actions: 'getAll'}, (res) => {
            $scope.code = angular.toJson(res, true);
        });
    };

    $scope.update = function() {
        Api.update({id:123, actions: 'update'}).$promise.then(res => {
            $scope.code = angular.toJson(res, true);
        });
    };

    $scope.delete = function() {
        Api.delete({id:123, actions: 'delete'}).$promise.then(res => {
            $scope.code = angular.toJson(res, true);
        });
    };
}]);

