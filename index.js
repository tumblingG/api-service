require('./src/api.module');
var service = require('./src/api.service');
exports.apiModule = 'api.service';
exports.ApiService = service.ApiService;
exports.ResourceParams = service.ResourceParams;