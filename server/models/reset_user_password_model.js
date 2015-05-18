'use strict';

var mailer = require('../services/mailer');
var Checkit = require('checkit');
var Backbone = require('backbone');
var coreServicesSdk = require('../services/core_services_sdk');
var validate = new Checkit({
  password: 'required',
  token: 'required'
});

var ResetUserPasswordModel = Backbone.Model.extend({

  validate: function () {
    var model = this.toJSON();
    return validate.run(model);
  },

  save: function () {
    var model = this.toJSON();

    function confirmResetPasswordSuccess(userInfo) {
      //send reset token on user's email
      return mailer.resetPasswordNotification({
        toUser: {
          email: userInfo.email
        }
      });
    }

    return coreServicesSdk.userBiocard.resetPassword({
        body: {
          password: model.password
        },
        params: {
          token: model.token
        }
      })
      .then(confirmResetPasswordSuccess);
  }
});

module.exports = ResetUserPasswordModel;
