var http = require('http');
var urlUtil = require('url');

http.createServer(function(request, response) {
    setHeader(response);
    const { headers, method, url } = request;
    let body = [];

    if (method === 'GET') {
        let responseBody;
        let query = urlUtil.parse(decodeURI(url), true).query;
        if (query.actions ==='getAll') {
            responseBody = [{ headers, method, url}];
        }else {
            responseBody = { headers, method, url};
        }
        responseFn(response, responseBody);
    }else if (method === 'DELETE') {
        let responseBody = { headers, method, url};
        responseFn(response, responseBody);
    }
    else {
        request.on('error', (err) => {
            console.error(err.stack);
        }).on('data', (chunk) => {
            body.push(chunk);
        }).on('end', () => {
            body = Buffer.concat(body).toString();
            let responseBody = { headers, method, url, body };
            responseFn(response, responseBody);
        });

    }

}).listen(8888);

console.log('Server running at http://127.0.0.1:8888/');

function setHeader(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.setHeader("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.setHeader("X-Powered-By",' 3.2.1');
    res.setHeader("Content-Type", "application/json;charset=utf-8");
}

function responseFn(res, data) {
    res.statusCode = 200;
    res.write(JSON.stringify(data));
    res.end();
}
