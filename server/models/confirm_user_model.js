'use strict';

var Checkit = require('checkit');
var Backbone = require('backbone');
var coreServicesSdk = require('../services/core_services_sdk');
var validate = new Checkit({
  id: 'required',
  token: 'required'
});

var ConfirmUserModel = Backbone.Model.extend({

  validate: function () {
    var model = this.toJSON();
    return validate.run(model);
  },

  save: function () {
    var model = this.toJSON();
    return coreServicesSdk.userBiocard.confirmUser({
      params: model
    });
  }
});

module.exports = ConfirmUserModel;
