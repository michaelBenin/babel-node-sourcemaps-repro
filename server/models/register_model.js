'use strict';

/**
 * Model for register form, validation is done with checkit
 * @module models/register_model
 * @see {@link https://github.com/tgriesser/checkit}
 * @see {@link http://backbonejs.org/#Model-extend}
 * @example <caption>Should be used as a constructor.</caption>
 * // returns class instance
 * var registerModel = new RegisterModel({});
 * @example <caption>Has save() and validate() methods.</caption>
 * // returns promise
 * var registerModel = new RegisterModel({});
 * registerModel.save().then().catch()
 * registerModel.validate().then().catch()
 */

/**
 * Is used for validation
 * @type Checkit
 * @see {@link https://github.com/tgriesser/checkit}
 */
var Checkit = require('checkit');
/** core service methods */
var coreServicesSdk = require('../services/core_services_sdk');
var Backbone = require('backbone');
var config = require('../config');
var _ = require('lodash');
var promiseAll = require('bluebird').all;
/** mailing methods */
var mailer = require('../services/mailer');
/**
 * The Terms Of Service ID
 * Needed for setting the terms of service
 * @static
 */
var tosId = 'test_tos';
/**
 * The Terms Of Service Version
 * Needed for setting the terms of service
 * @static
 */
var tosVersion = 'version_0';
/** Error to check for with bluebird catch */
var ConfirmationEmailSent = require('../utils/promise_error_util').confirmationEmailSent;

/**
 * Validator.
 * @type {Checkit}
 */
var validate = new Checkit({
  firstName: [{
    rule: 'required',
    message: 'Hey Girl, I need your first name.'
  }, {
    rule: 'maxLength:150',
    message: 'Hey Girl, your name is just too long! Less than 150 characters please.'
  }],
  lastName: [{
    rule: 'required',
    message: 'Hey Girl, what\'s your last name?'
  }, {
    rule: 'maxLength:150',
    message: 'Hey Girl, your last name can\'t be more than 150 characters'
  }],
  email: [{
    rule: 'required',
    message: 'Hey Girl, I can\'t sign you up without your email.'
  }, {
    rule: 'email',
    message: 'Hey Girl, that doesn\'t look like a valid email.'
  }, {
    rule: 'maxLength:150',
    message: 'Hey Girl, your email is too long. Keep it under 150 characters.'
  }],
  password: [{
    rule: 'required',
    message: 'Hey Girl, give me a password. It\'ll be just between us.'
  }, {
    rule: 'maxLength:20',
    message: 'Hey Girl, you\'re being overambitious. ' +
      'Your password can\'t be more than 20 characters.'
  }],
  passwordConfirmation: [{
    rule: 'required',
    message: 'Hey Girl, you need to confirm your password.'
  }, {
    rule: 'matchesField:password',
    message: 'Hey Girl, your passwords don\'t match. I can\'t help you until you figure that out!'
  }],
  origin: 'required'
});

/**
 * @constructor
 * @extends Backbone.Model
 */
var RegisterModel = Backbone.Model.extend(
  /**
   @lends RegisterModel.prototype
  */
  {

    /**
     * businessType will default to an empty string
     * @default
     */
    defaults: {
      businessType: ''
    },

    /**
     * @method module:models/register_model#validate
     * @returns promise
     */
    validate: function () {
      /**
       * @method module:models/register_model.validate#run
       * @param {object} json - makes sure it's valid
       * @returns promise
       */
      return validate.run(this.toJSON());
    },

    /**
     * @method module:models/register_model#save
     * @returns promise
     */
    save: function () {
      var self = this;
      var user = {};

      /** Persists, agreements, preferences, and sends confirmation email, returns promise */
      function addAdditionalInformation(createResponse) {
        user = createResponse;
        self.set('id', createResponse.id);

        function returnUser() {
          return _.omit(self.toJSON(), ['password', 'passwordConfirmation']);
        }

        return promiseAll([
          addAgreements(user),
          addBusinessType(user),
          sendConfirmationEmail(user)
        ]).then(returnUser);
      }

      /** Persists agreements */
      function addAgreements(userResponse) {
        coreServicesSdk.userBiocard.approveAgreements({
          params: {
            id: userResponse.id
          },
          body: {
            tos: {
              id: tosId,
              version: tosVersion
            }
          }
        }).then(function (saveUserAgreementsResponse) {
          _.extend(user, saveUserAgreementsResponse);
        });
      }

      /** Persists user preferences */
      function addBusinessType(userResponse) {
        coreServicesSdk.userBiocard.saveUserPreferences({
          params: {
            userId: userResponse.id,
            siteId: config.get('session:sitekey')
          },
          body: {
            private: {
              preferences: {
                businessType: self.get('businessType')
              }
            }
          }
        }).then(function (saveUserPreferencesResponse) {
          _.extend(user, saveUserPreferencesResponse);
        });
      }

      /** Confirms email is sent or is sending */
      function confirmationEmailSending(res) {
        return mailer.getEmailStatus(res)
          .then(function checkStatus(res) {
            var status = _.isMatch(res, {
                status: 'delivered',
                errorMessage: null
              }) ||
              _.isMatch(res, {
                status: 'in_progress',
                errorMessage: null
              });

            if (!status) {
              throw new ConfirmationEmailSent();
            }
          });
      }

      /** Sends the confirmation email */
      function sendConfirmationEmail(userResponse) {
        mailer.confirmRegistrationEmail(userResponse, self.get('origin'))
          .then(confirmationEmailSending);
      }

      /*
      User biocard does not play well with validations for country
       http://jira.pme.penton.com/browse/CS-9
       errors:
       [ { fieldName: 'country',
       message: 'Country min length is 1 char, max length is 255 chars.',
       value: '' } ] }
       */
      var omittedFields = ['passwordConfirmation', 'businessType', 'origin'];
      if (!self.get('country')) {
        omittedFields.push('country');
      }
      var createdUserBody = _.omit(self.toJSON(), omittedFields);

      return coreServicesSdk.userBiocard.createUser({
          body: createdUserBody
        })
        .then(addAdditionalInformation);
    }

  });

module.exports = RegisterModel;
