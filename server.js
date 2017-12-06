var http = require('http');
var url = require('url');
var util = require('util');

http.createServer(function(request, response) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.writeHead(200, {'Content-Type': 'text/json; charset=utf-8'});
    // var url = util.inspect(url.parse(request.url, true));
    // var url = url.parse(request.url, true);
    // console.log(url.path);
    response.end(JSON.stringify({id: 12, actions: 'get'}));
    // response.end('Hello World\n');
}).listen(8888);

console.log('Server running at http://127.0.0.1:8888/');