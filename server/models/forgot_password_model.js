'use strict';

var Checkit = require('checkit');
var Backbone = require('backbone');
var coreServicesSdk = require('../services/core_services_sdk');
var mailer = require('../services/mailer');
var _ = require('lodash');
var get = require('getobject').get;
var promiseUtil = require('../utils/promise_error_util');
var ResetPasswordTokenError = promiseUtil.resetPasswordTokenUnavailable;
var ResetPasswordEmailSentError = promiseUtil.resetPasswordEmailSent;

var validate = new Checkit({
  email: [{
    rule: 'required',
    message: 'Hey girl, this email address is required.'
  }, {
    rule: 'email',
    message: 'Hey girl, this email address needs to be valid.'
  }]
});

var ForgotPasswordModel = Backbone.Model.extend({

  validate: function () {
    var model = this.toJSON();
    return validate.run(model);
  },

  save: function () {

    var self = this;
    var model = this.toJSON();

    var forgotPasswordBody = {
      body: _.omit(model, 'origin')
    };

    function sendResetPasswordEmail(tokenInfo) {
      var resetPasswordToken = get(tokenInfo, 'resetPasswordToken');

      if (resetPasswordToken) {
        return mailer.resetPasswordEmail({
          toUser: {
            email: self.get('email')
          },
          token: resetPasswordToken,
          baseUrl: self.get('origin')
        });
      }

      throw new ResetPasswordTokenError();
    }

    function resetPasswordEmailSending(res) {
      return mailer.getEmailStatus(res);
    }

    function checkStatusOfEmail(res) {
      var status = _.isMatch(res, {
          status: 'delivered',
          errorMessage: null
        }) ||
        _.isMatch(res, {
          status: 'in_progress',
          errorMessage: null
        });

      if (!status) {
        throw new ResetPasswordEmailSentError();
      }
    }

    return coreServicesSdk.userBiocard
      .forgotPassword(forgotPasswordBody)
      .then(sendResetPasswordEmail)
      .then(resetPasswordEmailSending)
      .then(checkStatusOfEmail);
  }
});

module.exports = ForgotPasswordModel;
