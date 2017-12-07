# api-service
一个使用es6代理和ES7装饰器包装的ngResource服务模块,用于快速构建reset风格的API服务,设置缓存等。

> 基本使用案例

```
let  { apiModule, ResourceParams, ApiService } = require('api-service');

@ResourceParams({
    apiPath: '/app/:id',
})
class Api extends ApiService{}

var app = angular.module('app', [apiModule]).service('Api', Api);
```
> `api-service`包主要由三部分构成：
- `apiModule`,angualr模块，包含了一个名为`localCacheServiceProvider`的提供者，该提供者封装了操作本地缓存的统一API。
- `ResourceParams`，装饰器，用于在运行时将元数据加入类中。
- `ApiService`,包装了$resource服务的类。
### localCacheServiceProvider
该服务封装了本地缓存的统一API，`api-service`包提供了两种本地持久缓存的策略：`localStorage`和`indexedDB`，默认使用`localStorage`，关于`localStorage`和`indexedDB`的差别请查看MDN文档。
```
var app = angular.module('app', [apiModule])
    .config(['localCacheServiceProvider', function(localCacheServiceProvider){
    localCacheServiceProvider.setConfig({
        API_SERVER: 'http://localhost:8888'
    });
}]);
```
`localCacheServiceProvider`暴露了`setConfig`方法用来配置本地缓存服务，如以上我们通过`API_SERVER`字段配置了访问服务器的地址。如果你确定使用`localStorage`的话，那么以上配置是足够的，如过你想缓存的数据很大，那么推荐使用`indexedDB`作为缓存策略，此时你需要另外设置以下信息。
```
localCacheServiceProvider.setConfig({
        API_SERVER: 'http://localhost:8888',
        DB_TYPE: 'indexedDB', //选择indexedDB缓存策略
        DB_NAME: 'xxx', //数据库名称(可选，默认‘MY_CLIENT_DB’)
        DB_VERSION: 1, //数据库版本号（可选，默认1）
        DB_STORE_NAME: 'yyy'  //存储对象名称（可选，默认‘HTTP_REQUEST_CACHE’）
    });
```
> `localCacheService`服务暴露的API
- getApi: function()，返回设置的API_SERVER。
- setItem: function(key, data)，保存数据。
- getItem: function(key)，获取数据。
- removeItem: function(key)，删除一条数据。
- clear()，清空全部缓存。
- clearFuzzyMatch: function(key),模糊匹配删除，会删除以key开头的键的数据。
- deleteDB: function()，删除数据库(indexedDB模式专有)。
- closeDB: function()，关闭数据库(indexedDB模式专有)。

这些API你可能都不需要使用到，因为它们主要用于为`ApiService`类提供服务。当然你可能在系统中做一个清除缓存的按钮，例如：
```
app.controller('myCtrl', ['$scope', 'localCacheService', function($scope){
    $scope.clear = function() {
        localCacheService.clear();
    };
}]);
```
### 快速创建reset风格的API
使用这个包你可以快速的创建一个reset风格`$resource`API，下面是一个例子：
```
let { ResourceParams, ApiService } = require('api-service');

@ResourceParams({
    apiPath: '/app/:id',
})
class Api extends ApiService{}

app.service('Api', Api);
```
使用:
```
app.controller('myCtrl', ['$scope', 'Api', ($scope, Api) => {
    $scope.create = function() {
        //可以通过promise返回
        Api.create({id: 123}).$promise.then(res => {
            $scope.result = res;
        }).catch(err => {});
    };
    $scope.get = function() {
        //也可以通过回调函数回调，两种方式都可以
        Api.get({id: 234}, res =>{
            console.log(res);
        }, err => {
            console.log(err);
        }));
    }
}])
```
你只需要新建一个类继承`ApiService`,然后使用`@ResourceParams`装饰器装饰该类即可。
默认的提供了如下的`Params`和`Actions`：
```
const baseParams = {
        id: '@id',
        action: '@action',
        config: '@config'
    };
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
```
你可以通过元数据覆盖或者修改这些`Params`或者`Actions`。
### `@ResourceParams`装饰器元数据
```
@ResourceParams({
    apiPath: string,
    params: {},
    actions: {},
    getActions: function,
    getParams: function,
    actionsToLocalCache: [],
    disableCache: boolean,
    actionsToCache: [],
    cacheKey: 'string',
    cacheCapacity: number,
    identity: string
})
```
> apiPath：设置请求的路径，必须指定，如果省略将抛出一个错误。
```
@ResourceParams({
    apiPath: '/app/:id'
})
class Api extends ApiService{}
```
> params：自定义的params，将和`baseParams`做`angular.merge`合并,例如添加一个`template_id`默认参数
```
@ResourceParams({
    apiPath: '/app/:template_id'
    params: {
        template_id: ''
    }
})
class Api extends ApiService{}
```
> actions：自定义actions，将和`baseActions`做`angular.merge`合并,例如添加一个`view`方法
```
@ResourceParams({
    apiPath: '/app/:id'
    actions: {
        view: {
            method: 'GET'
        }
    }
})
class Api extends ApiService{}
```
> getParams：该字段应是一个函数，它的返回值将完全取代`baseParams`，例如我们设置了以下信息后，我们只能有`template_id`一个默认参数。
```
@ResourceParams({
    apiPath: '/app/:template_id'
    actions: () => {
        return {
            template_id: '@template_id'
        };

    }
})
class Api extends ApiService{}
```

> getActions：该字段应是一个函数，它的返回值将完全取代`baseActions`，例如我们设置了一下信息后，我们只能使用`view`方法。
```
@ResourceParams({
    apiPath: '/app/:id'
    actions: () => {
        return {
            view: {
                method: 'GET'
            }
        };

    }
})
class Api extends ApiService{}
```
> `actionsToLocalCache`：指定哪些`GET`方法要持久性的缓存到本地，使用以上我们介绍的缓存策略。例如以下我们设置了`get`和`getAll`，这个两个方法请求的数据将会持久性的保存在本地，即使关闭浏览器也会保存，下次请求的时候会直接从本地读取，不再去请求服务器。
```
@ResourceParams({
    apiPath: '/app/:id'
    actionsToLocalCache: ['get', 'getAll']
})
class Api extends ApiService{}
```
> disableCache：一个boolean，默认将所有`GET`请求都缓存到angular的cache里，下次请求的时候直接从cache拿而不会去请求服务器，这个cache的生命周期在关闭应用时结束，这和上面的`actionsToLocalCache`有本质的区别。如果设为true，则会禁止angular缓存所有`GET`请求。
```
@ResourceParams({
    apiPath: '/app/:id'
    disableCache: true
})
class Api extends ApiService{}
```
> actionsToCache：一个数组，用于指定哪些`GET`请求需要被缓存，一旦设置该数组，则会覆盖默认配置，只有该数组里的方法会被缓存，而其他的则被忽略。需要注意的是`disableCache`拥有较高的优先级，`disableCache`为true的时候不应该再设置该字段，因为此时所有请求都被禁止缓存。例如以下只有`list`方法会被缓存
```
@ResourceParams({
    apiPath: '/app/:id'
    actionsToCache: ['list']
})
class Api extends ApiService{}
```
> 注意：(disableCache,actionsToCache)和actionsToLocalCache没有什么关系，设置(disableCache,actionsToCache)的值并不会影响本地的持久性缓存，只会影响到angular自带的缓存，同样的设置actionsToLocalCache也不会影响angular的缓存。

> cacheKey：一个string，用来生成保存数据的key，请指定一个唯一个的值，缺省将使用`apiPath`字段代替。
```
@ResourceParams({
    apiPath: '/app/:id'
    cacheKey: 'app'
})
class Api extends ApiService{}
```
> cacheCapacity：一个number，默认20，用于设置angualr cache的容量。
```
@ResourceParams({
    apiPath: '/app/:id'
    cacheCapacity: 20
})
class Api extends ApiService{}
```
> identity: string，用于标识用户，对于同一个应用的的同一个请求，你也许希望针对不同的用户保存相应的内容。而删除的时候也只是删除相应用户的数据，那么这个字段是有用的。