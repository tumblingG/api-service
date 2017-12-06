let  { apiModule, ResourceParams, ApiService} = require('../index');

@ResourceParams({
    apiPath: '/app/:id',
    actionsToCache: ['get'],
    disableCache: false
})
class Api extends ApiService{}

var app = angular.module('app', [apiModule]);

app.config(['localCacheServiceProvider', function(localCacheServiceProvider){
    localCacheServiceProvider.setConfig({
        API_SERVER: 'http://localhost:8888'
    });
}]);

app.controller('myCtrl', ['$scope','Api','$resource', function($scope, Api,$resource) {
    console.log(Api.cacheKey);
    $scope.save = function() {
        Api.get({id:123, actions: 'ggg'}).$promise.then(res => {

            console.log(res);
        });
        // Api.get({id:123}, (res) => {
        //     console.log(res.id, res.actions);
        // })
    };
    $scope.get = function() {
        var User = $resource('http://localhost:8888/user/:userId', {userId:'@id'});
        var user = User.get({userId:123}, function(res) {
            console.log(user);
        });
    }
}]);

app.service('Api', Api);