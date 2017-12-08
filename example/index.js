let  { apiModule, ResourceParams, ApiService} = require('../index');
//实际项目中你应该使用 let  { apiModule, ResourceParams, ApiService} = require('api-service');

//创建服务类
@ResourceParams({
    apiPath: '/app/:id',
    actionsToLocalCache: ['get'],
    cacheKey: 'app.test',
    // disableCache: true
    // actionsToCache: ['get']
})
class Api extends ApiService{}

//加入‘apiModule’到根模块
var app = angular.module('app', [apiModule]);

//设置服务器地址
app.config(['localCacheServiceProvider', '$logProvider', function(localCacheServiceProvider){
    localCacheServiceProvider.setConfig({
        API_SERVER: 'http://localhost:8888',
        // DB_TYPE: 'indexedDB'
    });
}]);

//创建服务
app.service('Api', Api);

//控制器
app.controller('myCtrl', ['$scope','Api', 'localCacheService', function($scope, Api, localCacheService) {
    //设置用户标识
    localCacheService.setIdentity("AAAAA");
    //查看cacheKey
    console.log(Api.cacheKey);

    //actions: create
    $scope.create = function() {
        Api.create({id:123 , actions: 'create'}, (res) => {
            $scope.code = angular.toJson(res, true);
        });
    };

    //actions: get
    $scope.get = function() {
        Api.get({id:123, actions: 'get'}).$promise.then(res => {
            $scope.code = angular.toJson(res, true);
        });
    };

    //actions: list
    $scope.list = function() {
        Api.list({id:123, actions: 'list'}).$promise.then(res => {
            $scope.code = angular.toJson(res, true);
        });
    };

    //actions: getAll
    $scope.getAll = function() {
        Api.getAll({id:123 , actions: 'getAll'}, (res) => {
            $scope.code = angular.toJson(res, true);
        });
    };

    //actions: update
    $scope.update = function() {
        Api.update({id:123, actions: 'update'}).$promise.then(res => {
            $scope.code = angular.toJson(res, true);
        });
    };

    //actions: delete
    $scope.delete = function() {
        Api.delete({id:123, actions: 'delete'}).$promise.then(res => {
            $scope.code = angular.toJson(res, true);
        });
    };
}]);

