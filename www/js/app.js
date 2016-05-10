// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
var db = null;
var hostURL;
var domain;
var port;
angular.module('app', ['ionic', 'app.controllers', 'app.routes', 'app.services', 'app.directives', 'ui.rCalendar', 'ngCordova'])

.config(['$httpProvider', function($httpProvider) {
    //$httpProvider.defaults.withCredentials = true;
    //   $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    // $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}])

.run(function($ionicPlatform, $rootScope, $cordovaSQLite, $ionicPopup, $state, scheduleLocalNotifications, meamlogin, err_hand) {
    $ionicPlatform.ready(function() {
        if(device.platform === "iOS") {
            //window.plugin.notification.local.promptForPermission();
            cordova.plugins.notification.local.registerPermission(function (granted) {
                console.log('Permission has been granted: ' + granted);
            });
        }
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleDefault();
        }

        //alert("INSIDE INITIAL RUN FUNCTION");

        //create table for persistent storage
        db = $cordovaSQLite.openDB({
            name: "my.db",
            iosDatabaseLocation: 'default'
        });

        $rootScope.sessionID = null;
        //$cordovaSQLite.execute(db, "DROP TABLE schedule");
        //$cordovaSQLite.execute(db, "DROP TABLE pref");
        //$cordovaSQLite.execute(db, "DROP TABLE accountInfo");
        //$cordovaSQLite.execute(db, "DROP TABLE NotificationTable");
        $cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS pref (variable text primary key, val integer)");
        $cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS accountInfo (variable text primary key, val text)");
        $cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS NotificationTable (day text, starthour text, endhour text, notifID integer, PRIMARY KEY (notifID))");
        $cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS schedule (id integer primary key, day text, starthour text, endhour text, left text, block_color text, block_top text, block_height text)");

        //alert("INSIDE INITIAL RUN FUNCTION");

        $cordovaSQLite.execute(db, "INSERT OR IGNORE INTO pref (variable, val) VALUES (\"loginBool\", 0)");
        $cordovaSQLite.execute(db, "INSERT OR IGNORE INTO accountInfo (variable, val) VALUES (\"hosturl\", \"http://meamdev.ucdavis.edu:8000/\")");

        $cordovaSQLite.execute(db, "SELECT val FROM accountInfo WHERE variable = \"hosturl\"").then(function(res){
            hostURL = res.rows.item(0).val;
            temp = hostURL.split(":");
            $rootScope.domain = temp[0] + ":" + temp[1];
            $rootScope.port = temp[2].split("/")[0];
            //alert(hostURL);
        });


        $cordovaSQLite.execute(db, "SELECT * FROM pref WHERE variable = \"loginBool\"").then(function(res){
            if(res.rows.item(0).val == 1){
                $cordovaSQLite.execute(db, "SELECT * FROM accountInfo WHERE variable = \"user\" OR variable = \"pass\"").then(function(res){
                    var user = null;
                    var pass = null;

                    for(i = 0; i < res.rows.length; i++){
                        console.log(res.rows.item(i).variable);
                        if(res.rows.item(i).variable  == 'user'){
                            user = res.rows.item(i).val;
                        }
                        else if(res.rows.item(i).variable  == 'pass'){
                            pass = res.rows.item(i).val;
                        }
                    }

                    console.log("User: " + user);
                    console.log("Password: " + pass);

                    if(user && pass){
                        meamlogin.login(user, pass);
                    }
                });
            }
        });

        //clear out all triggered notifications from notification table
        $cordovaSQLite.execute(db, "SELECT * FROM NotificationTable").then(function(res){
            for(var i = 0; i < res.rows.length; i++){
                if(res.rows.item(i).notifID < Date.now()){
                    console.log("DELETE " + res.rows.item(i).notifID);
                    $cordovaSQLite.execute(db, "DELETE FROM NotificationTable WHERE notifID = ?", [res.rows.item(i).notifID]);
                }
            }
        });

        //Setup for Click of Local Notification
        cordova.plugins.notification.local.on("click", function(notification) {
            console.log(notification);
            //alert("clicked: " + notification.id);
            var confirmPopup = $ionicPopup.confirm({
              title: 'Record Music Memento Moment',
              template: 'Would you like a record a Music Memento Moment now?',
              okText: 'Yes',
              cancelText: 'No'
            });

            confirmPopup.then(function(res) {
              if (res) {
                $state.go('tabsController.settings', {
                    reload: true
                });
                console.log('You are sure');
              } else {
                console.log('You are not sure');
                $state.go('tabsController.login', {reload: true});
              }
            });
        });

        //Schedule more notifications
        $cordovaSQLite.execute(db, "SELECT * FROM schedule").then(function(res){
            for(i = 0; i < res.rows.length; i++){
                var row = res.rows.item(i);
                scheduleLocalNotifications.scheduleLNScope(db, row.day, row.starthour, row.endhour);
            }
        })
    })
})

// .controller('CalendarCtrl', function($scope, $rootScope, $ionicScrollDelegate, $ionicPopup, $cordovaSQLite, $cordovaLocalNotification, scheduleLocalNotifications, conversions) {

//     var startHour = 0;
//     var endHour = 24;
//     var usehalfhour = false;

//     //css measurements in pixels
//     var session_block_height = 25;
//     var session_block_width = 100;
//     var time_label_width = 60;

//     $scope.timerleft = '0px';

//     $scope.hours = getHours();
//     $scope.days = getDays();
//     $scope.events = [];

//     function getHours() {
//         var tmp = [];
//         for (i = startHour; i <= endHour; i++) {
//             tmp.push(('0' + i).slice(-2) + ':00');
//             if (usehalfhour && i < endHour) {
//                 tmp.push(('0' + i).slice(-2) + ':30');
//             }
//         }

//         return tmp;
//     };

//     function getNumWeekdays() {
//         var weekday = {};
//         weekday["Sunday"] = 0;
//         weekday["Monday"] = 1;
//         weekday["Tuesday"] = 2;
//         weekday["Wednesday"] = 3;
//         weekday["Thursday"] = 4;
//         weekday["Friday"] = 5;
//         weekday["Saturday"] = 6;
//         return weekday;
//     };

//     function getDays() {
//         var weekday = new Array(7);
//         weekday[0] = "Sunday";
//         weekday[1] = "Monday";
//         weekday[2] = "Tuesday";
//         weekday[3] = "Wednesday";
//         weekday[4] = "Thursday";
//         weekday[5] = "Friday";
//         weekday[6] = "Saturday";
//         return weekday;
//     };

//     function padZeroes(num) {
//         if (num < 10) {
//             return '0' + num.toString();
//         }

//         return num.toString();
//     };

//     $scope.deleteEvent = function(day, start_hour, end_hour) {
//         console.log("INSIDE DELETE EVENT");
//         console.log("Day: " + day + " starthour: " + start_hour + " endhour: " + end_hour);
//         var ui_query = "DELETE FROM schedule WHERE day = ? AND starthour = ? AND endhour = ?";
//         $cordovaSQLite.execute(db, ui_query, [day, start_hour, end_hour]);

//         console.log("Schedule Table Results");
//         var test_query = "SELECT * FROM schedule";
//         $cordovaSQLite.execute(db, test_query).then(function(res) {
//             for(i=0; i < res.rows.length; i++){
//                 console.log(res.rows.item(i));
//             }
//         });

//         //console.log($scope.events.length);

//         for (var i = 0; i < ($scope.events).length; i++) {
//             if ($scope.events[i]["day"] == day && $scope.events[i]["starthour"] == start_hour && $scope.events[i]["endhour"] == end_hour) {
//                 $scope.events.splice(i, 1);
//                 break;
//             }
//         }

//         cordova.plugins.notification.local.getIds(function(ids) {
//             console.log("IDs HERE: ");
//             console.log(ids);
//         }, cordova.plugins);

//         var be_del_query = "DELETE FROM NotificationTable WHERE day = ? AND starthour = ? AND endhour = ?";
//         var be_del_notif_query = "SELECT * FROM NotificationTable WHERE day = ? AND starthour = ? AND endhour = ?";

//         //grab all notifications associated with the block
//         $cordovaSQLite.execute(db, be_del_notif_query, [day, start_hour, end_hour]).then(function(res){
//             console.log("Inside be_del_notif_query");
//             console.log(res.rows);
//             if (res.rows.length > 0){
//                 //delete notifications from notification center
//                 for(var i = 0; i < res.rows.length; i++){
//                     console.log(res.rows.item(i));
//                     cordova.plugins.notification.local.cancel(res.rows.item(i).notifID, function(){
//                         console.log("Cancellation Complete");
//                     });
//                 }
//             }
//             console.log("after be_del_notif_query");

//             //clear the NotificationTable
//             $cordovaSQLite.execute(db, be_del_query, [day, start_hour, end_hour]);
//         });
//     }

//     $scope.gotScrolled = function() {

//         $scope.timerleft = $ionicScrollDelegate.getScrollPosition().left + 'px';
//         $scope.$apply();

//     };

//     $scope.insertEvent = function(day, start_hour, end_hour, left_pos, top_pos, block_height, color) {
//         //console.log("inside insert Event");
//         //console.log('top_pos ' + top_pos);
//         //console.log('block_height ' + block_height);
//         //console.log('color ' + color);
//         var query = "INSERT INTO schedule (day, starthour, endhour, left, block_color, block_top, block_height) VALUES (?,?,?,?,?,?,?)";
//         $cordovaSQLite.execute(db, query, [day, start_hour, end_hour, left_pos, color, top_pos, block_height]).then(function(res) {
//             console.log("Insert Event Complete. ID: " + res.insertId);
//             console.log("inside execute");
//         }, function(err) {
//             console.error(err);
//         });
//     };

//     $scope.selectEvents = function() {
//         var query = "SELECT * FROM schedule";
//         $cordovaSQLite.execute(db, query, []).then(function(res) {
//             if (res.rows.length > 0) {
//                 //console.log("SELECTED -> " + res.rows.item(0).day);
//                 //console.log(res.rows.item(0));

//                 for (var i = 0; i < res.rows.length; i++) {
//                     var obj = {
//                         day: res.rows.item(i).day,
//                         starthour: res.rows.item(i).starthour,
//                         endhour: res.rows.item(i).endhour,
//                         left: res.rows.item(i).left,
//                         top: res.rows.item(i).block_top,
//                         height: res.rows.item(i).block_height,
//                         color: res.rows.item(i).block_color
//                     };

//                     //console.log(obj);
//                     $scope.events.push(obj);
//                 }
//             } else {
//                 console.log("No results found");
//             }
//         }, function(err) {
//             console.error(err);
//         });
//     };

//     function loadSessionBlock() {
//         $scope.selectEvents();
//     };

//     loadSessionBlock();

//     $scope.addEvent = function(day, start_hour, end_hour) {
//         //calculate positions of session block
//         var left_pos = time_label_width + getNumWeekdays()[day] * session_block_width;
//         var top_pos = Math.round(23 + (conversions.convertTimeToNum(start_hour) - 1) * session_block_height);
//         var block_height = Math.round(session_block_height * (conversions.convertTimeToNum(end_hour) - conversions.convertTimeToNum(start_hour)));
//         var block_color = 'rgba(0,157,151,0.75)';

//         top_pos = top_pos.toString();
//         block_height = block_height.toString();
//         console.log("top pos here:");
//         console.log(top_pos.toString());
//         console.log(block_height.toString());

//         //save to local persistent storage
//         var eventId = $scope.insertEvent(day, start_hour, end_hour, left_pos.toString() + 'px', top_pos + 'px', block_height + 'px', block_color);

//         //add to the ui
//         $scope.events.push({
//             day: day,
//             starthour: start_hour,
//             endhour: end_hour,
//             left: left_pos + 'px',
//             top: top_pos + 'px',
//             height: block_height + 'px',
//             color: 'rgba(0,157,151,0.75)'
//         });
//     }

//     $scope.onAddAvailability = function() {
//         $scope.eventTime = {};
//         $ionicPopup.show({
//             template: 'Weekday: <br> <select class="ion-input-select--large" ng-model="eventTime.day"><option>Sunday</option><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option></select></br>Start Time: <input type="time" ng-model="eventTime.start"> End Time: <input type="time" ng-model="eventTime.end">',
//             title: 'Time availability',
//             scope: $scope,
//             buttons: [{
//                 text: 'Cancel'
//             }, {
//                 text: '<b>Apply</b>',
//                 type: 'button-positive',
//                 onTap: function(e) {
//                     if ($scope.eventTime.start && $scope.eventTime.end && $scope.eventTime.day) {
//                         return {
//                             day: $scope.eventTime.day,
//                             startTime: $scope.eventTime.start,
//                             endTime: $scope.eventTime.end
//                         };
//                     } else e.preventDefault();
//                 }
//             }]
//         }).then(function(res) {
//             if(res == null){
//                 alert("Cancelled");
//             }
//             $scope.selectEvents();
//             var mil_start_time = "" + res.startTime.getHours() + ":" + padZeroes(res.startTime.getMinutes());
//             var mil_end_time = "" + res.endTime.getHours() + ":" + padZeroes(res.endTime.getMinutes());
//             $scope.addEvent(res.day, mil_start_time, mil_end_time);

//             console.log("Schedule LN for Block");
//             scheduleLocalNotifications.scheduleLNForBlock(db, res.day, mil_start_time, mil_end_time);

//             //TODO:SEND HTTP REQUEST TO SERVER CALENDAR
//             /*var obj = {
//                 "day": res.day,
//                 "startTime": mil_start_time,
//                 "endTime": mil_end_time,
//                 "isMobile": "True",
//                 "sessionid": sessionID
//             }

//             console.log(obj);*/
//         });
//     };

//     $scope.testButton = function() {
//         $cordovaSQLite.execute(db, "SELECT * FROM NotificationTable").then(function(res){
//             for(var i = 0; i < res.rows.length; i++){
//                 var temp = new Date(res.rows.item(i).notifID);
//                 console.log(temp.toLocaleString());
//             }
//         });

//         console.log("accountInfo");
//         $cordovaSQLite.execute(db, "SELECT * FROM accountInfo").then(function(res){
//             console.log("accountInfo")
//             for(var i = 0; i < res.rows.length; i++){
//                 console.log("Variable: " + res.rows.item(i).variable + " Value: " + res.rows.item(i).val);
//             }
//         });

//         $cordovaSQLite.execute(db, "SELECT * FROM pref").then(function(res){
//             console.log("pref")
//             for(var i = 0; i < res.rows.length; i++){
//                 console.log("Variable: " + res.rows.item(i).variable + " Value: " + res.rows.item(i).val);
//             }
//         });
//     }
// })
