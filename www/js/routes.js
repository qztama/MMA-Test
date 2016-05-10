angular.module('app.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
    
      
        
    .state('tabsController.login', {
      url: '/page6',
      views: {
        'tab4': {
          templateUrl: 'templates/login.html',
          controller: 'loginCtrl'
        }
      }
    })
        
      
    
      
        
    .state('tabsController.signup', {
      url: '/page7',
      views: {
        'tab4': {
          templateUrl: 'templates/signup.html',
          controller: 'signupCtrl'
        }
      }
    })
        
      
    
      
        
    .state('tabsController.scheduler', {
      url: '/page8',
      views: {
        'tab5': {
          templateUrl: 'templates/calendar.html',
          controller: 'CalendarCtrl'
        }
      }
    })
        
      
    
      
        
    .state('tabsController.settings', {
      url: '/Settings',
      views: {
        'tab6': {
          templateUrl: 'templates/settings.html',
          controller: 'settingsCtrl'
        }
      }
    })
    
      
    .state('tabsController', {
      url: '/page10',
      abstract:true,
      templateUrl: 'templates/tabsController.html'
    })
      
    ;

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/page10/page6');

});