'use strict';

var ping = require('../controllers/ping_controller');

module.exports = function (router) {

  router.get('/api/v1/ping', ping);

};
