# api-service
一个封装了`ngResource`服务模块的库,用于快速构建`可设置本地缓存的`、`reset风格的`API服务。

下载：
`npm install --save ng1-api-service`

依赖：
- angular
- angular-resource

### 基本使用教程
#### 1、构建一个请求服务
```
let  { apiModule, ResourceParams, ApiService } = require('ng1-api-service');

@ResourceParams({
    apiPath: '/app/:id',
})
class Api extends ApiService{}

var app = angular.module('app', [apiModule]).service('Api', Api);
```
如上所示，构建一个API服务变得相当简单，从‘api-service’包导出`apiModule`、`ResourceParams`和`ApiService`。新建一个类继承`ApiService`,然后使用`@ResourceParams`装饰器为该类注入一些元数据，最后在跟模块中导入`apiModule`模块，然后使用service方法注入该服务即可。

你可以多次新建类继承`ApiService`,并使用`@ResourceParams`装饰器装饰该类来创建不同的请求API。这在一个大型的，需要发送多次请求的系统的会变得尤其高效，然而这个库的功能当然不可能只有这些，更详细的信息请查看高级使用教程。

#### 2、设置请求服务器地址
`apiModule`模块提供了了一个名为`localCacheServiceProvider`的提供者，通过它可以在config中设置服务器的地址，服务器地址只需要设置一次，那么每次的请求都会转发到该地址上。
```
app.config(['localCacheServiceProvider', function(localCacheServiceProvider){
    localCacheServiceProvider.setConfig({
        API_SERVER: 'http://localhost:8888'
    });
}]);
```
如以上我们在构建请求服务的时候设置了`apiPath`为`/app/:id`,那么最终的请求就是`http://localhost:8888/app/:id`。

#### 3、使用服务请求数据
该库使用和`$resource`服务一样的请求风格，如果你对于这种请求方式有任何疑惑的话请参考[NgResource](https://docs.angularjs.org/api/ngResource/service/$resource)。
```
app.controller('myCtrl', ['$scope', 'Api', ($scope, Api) => {
    $scope.create = function() {
        //可以通过promise返回
        Api.create({id: 123}).$promise.then(res => {
            $scope.result = res;
        }).catch(err => {});
    };
    $scope.get = function() {
        //也可以通过回调函数回调
        Api.get({id: 234}, res =>{
            console.log(res);
        }, err => {
            console.log(err);
        }));
    }
}])
```
#### 4、设置缓存服务
> 注：根据http规范，缓存只是在`GET`请求中有效，本篇所指的缓存也都是指`GET`请求，你不应该对一个除`GET`以外的请求设置缓存。

该库设置的缓存分为两种，一是设置持久性的本地缓存，使用`localStorage`或者`indexedDB`缓存策略，二是设置angular自带的cache缓存，这种缓存在应用生命周期内有效，关闭应用会自动清除。

设置缓存只需要在装饰器中提供相应的元数据即可，例如：

设置持久性本地缓存，名为‘list’的actions请求的数据将会被保存在本地。
```
@ResourceParams({
    apiPath: '/app/:id',
    actionsToLocalCache: ['list']
})
class Api extends ApiService{}
```
设置angular cache缓存：

默认的所有的`GET`请求都被设置为angular cache缓存的，你可以指定`disableCache`为`true`来禁止缓存所有actions请求，或者指定`actionsToCache`来设置只有指定的actions请求能够被缓存，`disableCache`拥有较高的优先级。
```
@ResourceParams({
    apiPath: '/app/:id',
    disableCache: true
})
class Api extends ApiService{}
```
更多功能及详细信息请参考高级使用教程。

## 编译
该库使用了ES6的代理以及ES7的装饰器新特性，所以需要babel来进行编译，下面是一个.babelrc文件的配置,具体的可以参考源文件中`example`的配置。
```
{
  "presets": [
    "es2015",
    "stage-0"
  ],
  "plugins": [
    "transform-decorators-legacy"
  ],
  "env": {
    "test": {
      "plugins": [
        "istanbul"
      ]
    }
  }
}

```
在webpack.config.js文件中,还要把node_modules/ng1-api-service加入编译列表中。
```
{
    test: /\.js$/,
    use: {
        loader: "babel-loader"
    },
    include: [
        path.resolve(__dirname, 'example'),
        /node_modules(?!\/ng1-api-service)/
    ]
}
```

## 高级使用教程
`api-service`包主要由三部分构成：
- `apiModule`模块，包含了一个名为`localCacheServiceProvider`的提供者，该提供者封装了操作本地缓存的统一API。
- `ResourceParams`装饰器，用于在运行时将元数据加入类中。
- `ApiService`基类，封装了$resource服务。
#### 1、localCacheServiceProvider提供者
该服务封装了本地缓存的统一API，`api-service`包提供了两种本地持久性缓存策略：`localStorage`和`indexedDB`，默认使用`localStorage`，关于`indexedDB`的使用请查看[IndexedDB](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)，`indexedDB`的使用是非常复杂的，但是在这里你不需要了解这些，因为它被封装为和`localStorage`一样的API。在存储大数据的时候推荐使用`indexedDB`。
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
        DB_TYPE: 'indexedDB', //选择indexedDB缓存策略，默认为'localStorage'
        DB_NAME: 'xxx', //数据库名称(可选，默认‘MY_CLIENT_DB’)
        DB_VERSION: 1, //数据库版本号（可选，默认1）
        DB_STORE_NAME: 'yyy'  //存储对象名称（可选，默认‘HTTP_REQUEST_CACHE’）
    });
```
除开`API_SERVER`和`DB_TYPE`是必须指定的外，其它的都提供了默认值，是可选的。

####  2、`localCacheService`服务暴露的API
- `getApi: function()`，返回设置的API_SERVER。
- `getIdentity: function()`，获取用户标识。
- `setIdentity: function(identity)`，设置用户标识。
- `setItem: function(key, data)`，保存数据。
- `getItem: function(key)`，获取数据。
- `removeItem: function(key)`，删除一条数据。
- `clear()`，清空全部缓存。
- `clearFuzzyMatch: function(key)`,模糊匹配删除，会删除以key开头的键的数据。
- `deleteDB: function()`，删除数据库(indexedDB模式专有)。
- `closeDB: function()`，关闭数据库(indexedDB模式专有)。

这些API你可能都不需要使用到，因为它们主要用于为`ApiService`基类提供服务。当然你可能在系统中做一个清除缓存的按钮，例如：
```
app.controller('myCtrl', ['$scope', 'localCacheService', ($scope, localCacheService) => {
    $scope.clear = function() {
        localCacheService.clear();
    };
}]);
```
#### 3、默认params和actions
默认的提供了以下的`params`和`actions`。
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
但是可以通过元数据替换或者修改默认的`params`或者`actions`，详情请查看下面的装饰器元数据。

#### 4、`@ResourceParams`装饰器元数据
下面列出了`@ResourceParams`装饰器可用的全部元数据，但是你可能一次只会用到其中的一种或几种。
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
    cacheKey: string,
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
> getParams：该字段应是一个函数，它的返回值将完全取代`baseParams`，例如我们设置了以下信息后，我们只能拥有`template_id`一个默认参数。需要注意的是，一旦设置了`getParams`你不应该再设置`params`元数据，因为此时api将忽略`params`的值，对于`getActions`也是一样的。
```
@ResourceParams({
    apiPath: '/app/:template_id'
    getParams: () => {
        return {
            template_id: '@template_id'
        };

    }
})
class Api extends ApiService{}
```

> getActions：该字段应是一个函数，它的返回值将完全取代`baseActions`，例如我们设置了以下信息后，我们只能使用`view`方法。
```
@ResourceParams({
    apiPath: '/app/:id'
    getActions: () => {
        return {
            view: {
                method: 'GET'
            }
        };

    }
})
class Api extends ApiService{}
```
> `actionsToLocalCache`：指定哪些actions方法要持久性的缓存到本地。例如以下我们设置了`get`和`getAll`，这个两个方法请求的数据将会持久性的保存在本地，下次打开浏览器请求的时候会直接从本地读取数据，而不再去请求服务器。
```
@ResourceParams({
    apiPath: '/app/:id'
    actionsToLocalCache: ['get', 'getAll']
})
class Api extends ApiService{}
```
> `disableCache`：一个`boolean`值，默认为`false`，会将所有actions请求都缓存到angular的cache里，下次请求的时候直接从cache拿而不会去请求服务器。如果设为true，则会禁止angular缓存所有actions请求。
```
@ResourceParams({
    apiPath: '/app/:id'
    disableCache: true
})
class Api extends ApiService{}
```
> `actionsToCache`：一个数组，用于指定哪些actions请求需要被缓存，一旦设置该数组，则会覆盖默认配置，只有该数组里的方法会被缓存，而其他的则被忽略。需要注意的是，`disableCache`拥有较高的优先级，`disableCache`为`true`的时候不应该再设置该字段，因为此时所有actions请求都被禁止缓存。
```
@ResourceParams({
    apiPath: '/app/:id'
    actionsToCache: ['list']
})
class Api extends ApiService{}
```

##### 注意：(`disableCache`,`actionsToCache`)和`actionsToLocalCache`没有什么关系，设置(`disableCache`,`actionsToCache`)的值并不会影响本地的持久性缓存，只会影响到`angular`自带的缓存，同样的设置`actionsToLocalCache`也不会影响`angular`的缓存。

> `cacheKey`：一个`string`，用来生成保存数据的key，请指定一个唯一个的值，缺省将使用`apiPath`字段代替。
```
@ResourceParams({
    apiPath: '/app/:id'
    cacheKey: 'app'
})
class Api extends ApiService{}
```
> `cacheCapacity`：一个`number`，默认20，用于设置angualr cache的容量。
```
@ResourceParams({
    apiPath: '/app/:id'
    cacheCapacity: 20
})
class Api extends ApiService{}
```
#### 5、设置用户标识
对于同一个应用的的同一个请求，你也许希望针对不同的用户保存相应的内容。而删除的时候也只是删除相应用户的数据。这时你可以调用`localCacheService`的`setIdentity(identity)`方法。

例如以下用例，在用户登录完成后从后台获取到用户的唯一标识`identity`，然后调用`localCacheService.setIdentity(identity)`，那么每个不同的用户就会保存不同的用户数据副本。
```
app.controller('myCtrl', ['LoginService,'localCacheService', (localCacheService) => {
    localCacheService.setIdentity(LoginService.getIdentity());
}]);
```
## demo
下面的命令会运行一个本地node服务器，并且打包应用程序。
```
cd api-service
npm install
//启动test服务器
node server.js
//webpack打包应用
npm run server
```