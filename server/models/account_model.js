'use strict';

/**
 * Model for account, validation is done with checkit
 * @module models/account_model
 * @see {@link https://github.com/tgriesser/checkit}
 * @see {@link http://backbonejs.org/#Model-extend}
 * @example <caption>Should be used as a constructor.</caption>
 * // returns class instance
 * var accountModel = new AccountModel({});
 * @example <caption>Has save() and validate() methods.</caption>
 * // returns promise
 * var accountModel = new accountModel({});
 * accountModel.read().then().catch();
 * accountModel.update().then().catch();
 * accountModel.validate().then().catch();
 */

/**
 * Is used for validation
 * @type Checkit
 * @see {@link https://github.com/tgriesser/checkit}
 */
var Checkit = require('checkit');
var Backbone = require('backbone');
/** core service methods */
var coreServicesSdk = require('../services/core_services_sdk');
var _ = require('lodash');
var get = require('getobject').get;
var config = require('../config');
var promiseAll = require('bluebird').all;

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
    rule: 'maxLength:20',
    message: 'Hey Girl, you\'re being overambitious. ' +
      'Your password can\'t be more than 20 characters.'
  }],
  passwordConfirmation: [{
    rule: 'matchesField:password',
    message: 'Hey Girl, your passwords don\'t match. I can\'t help you until you figure that out!'
  }]
});
// TODO: Add validation for phone numbers

/**
 * @constructor
 * @extends Backbone.Model
 */
var AccountModel = Backbone.Model.extend({
  /**
   * @lends AccountModel.prototype
   */
  defaults: {

    /**
     * addressLine1, addressLine2, city, state, zipCode,
     * phoneNumber, company, and primaryJobRole will default to an empty string.
     * country will default to null. The UserBiocard does not accept an
     * empty string for Country.
     * @default
     */
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: null,
    zipCode: '',
    phoneNumber: '',
    company: '',
    primaryJobRole: ''
  },
  //TODO: Add Newsletter

  /**
   * @method module:models/account_model#validate
   * @returns promise
   */
  validate: function () {
    /**
     * @method module:models/account_model.validate#run
     * @param {object} json - make sure its valid
     * @returns promise
     */
    return validate.run(this.toJSON());
  },

  /**
   * @method module:models/account_model#read
   * @param userId
   * @returns promise
   */
  read: function (userId) {
    var user = {};
    var self = this;

    /** Updates instantiated accountModel with
     * information retrieved from the biocard service,
     * returns the account
     * */
    function returnUser() {
      self.set(_.omit(user, ['gsa', 'tos', 'confirmedAt']));

      return {
        account: self.toJSON()
      };
    }

    /** Retrieves preferences and agreements from biocard service. */
    function getRestOfUser(userResponse) {

      user = userResponse;

      /** Adds preferences to user */
      function setPreferences(preferences) {
        var userPreferences = get(preferences, 'private.preferences');
        if (userPreferences) {
          _.extend(user, userPreferences);
        }
        return user;
      }

      /** Adds agreements to user */
      function setAgreements(agreements) {
        _.extend(user, agreements);
        return user;
      }

      return promiseAll([

        coreServicesSdk.userBiocard.getUserPreferences({
          params: {
            userId: userResponse.id,
            siteId: config.get('session:sitekey')
          }
        }).then(setPreferences),

        coreServicesSdk.userBiocard.agreementsHistory({
          params: {
            id: user.id
          }
        }).then(setAgreements)

      ]);
    }

    return coreServicesSdk.userBiocard.getUser({
        params: {
          id: userId
        }
      })
      .then(getRestOfUser)
      .then(returnUser);
  },

  /**
   * @method module:models/account_model#update
   * @param id
   * @returns promise
   */
  update: function (id) {
    var self = this;

    function requestPasswordToken(user) {

      return coreServicesSdk.userBiocard.forgotPassword({
        body: {
          email: user.email
        }
      });
    }

    function changePassword(token) {
      return coreServicesSdk.userBiocard.resetPassword({
        params: {
          token: token.resetPasswordToken
        },
        body: {
          password: self.get('password')
        }
      });
    }

    if (self.get('password')) {
      return coreServicesSdk.userBiocard.updateUser({
          params: {
            id: id
          },
          body: _.omit(self.toJSON(), 'passwordConfirmation')
        })
        .then(requestPasswordToken)
        .then(changePassword);
    }

    return coreServicesSdk.userBiocard.updateUser({
      params: {
        id: id
      },
      body: _.omit(self.toJSON(), 'passwordConfirmation')
    });
  }

});

module.exports = AccountModel;
