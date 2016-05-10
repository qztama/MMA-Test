angular.module('app.services', ['ionic', 'ngCordova'])

.factory('BlankFactory', [function() {

}])

.service('conversions', [function() {
    this.convertTimeToNum = function(time) {
        var tmp = time.split(":");

        return (parseInt(tmp[0]) + parseInt(tmp[1]) / 60);
    }

    this.convertTimeToMS = function(time) {
        var timeInInt = this.convertTimeToNum(time);

        return (timeInInt * 60 * 60 * 1000);
    };
}])

.service('err_hand', ['$ionicPopup', function($ionicPopup) {
    this.errPopup = function(err_message) {
        var errPopup = $ionicPopup.alert({
            title: 'ERROR',
            template: err_message
        });

        errPopup;
    }
}])

.service('scheduleLocalNotifications', ['$cordovaSQLite', 'conversions', function($cordovaSQLite, conversions) {

    self = this;

    this.addLocalNotification = function(schedulingTime, day, startTime, endTime) {
        console.log(schedulingTime.getTime());
        console.log(day);
        console.log(startTime);
        console.log(endTime);
        var text_field = day + "-" + startTime + "-" + endTime;
        console.log("Adding Notification " + schedulingTime.toLocaleString());
        cordova.plugins.notification.local.schedule({
            id: schedulingTime.getTime(),
            title: "Music Memento",
            at: schedulingTime,
            text: text_field,
            sound: null
        });
        /*.then(function() {
                    console.log("Notification Set " + schedulingTime.toLocaleString());
                });*/
    }

    this.randomTime = function(start, end) {
        var diff = end.getTime() - start.getTime();

        //schedule from startTime to endTime-15 min if possible
        if (diff > 15 * 60 * 1000) {
            diff -= 15 * 60 * 1000;
        }

        var new_diff = diff * Math.random();
        var date = new Date(start.getTime() + new_diff);
        return new_diff;
    }

    this.getNextDay = function(day) {
        var days = {
            sunday: 0,
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6
        };

        console.log(day.toLowerCase());
        var dayIndex = days[day.toLowerCase()];
        console.log(dayIndex);
        if (!dayIndex && dayIndex != 0) {
            throw new Error('"' + day + '" is not a valid input.');
        }

        var returnDate = new Date();
        var returnDay = returnDate.getDay();
        if (dayIndex !== returnDay) {
            returnDate.setDate(returnDate.getDate() + (dayIndex + (7 - returnDay)) % 7);
        }

        returnDate.setHours(0);
        returnDate.setMinutes(0);
        returnDate.setSeconds(0);
        returnDate.setMilliseconds(0);

        return returnDate;
    }

    this.scheduleLNForBlock = function(db, day, startTime, endTime) {
        var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        var numWeeksToSchedule = 1;
        var next_day = this.getNextDay(day);
        var query = "INSERT INTO NotificationTable (day, starthour, endhour, notifID) VALUES (?, ?, ?, ?)";
        console.log("starttime: " + startTime);
        console.log("endTime: " + endTime);

        for (var w = 0; w < numWeeksToSchedule; w++) {
            var start_date = new Date(next_day.getTime() + conversions.convertTimeToMS(startTime));
            var end_date = new Date(next_day.getTime() + conversions.convertTimeToMS(endTime));

            //if time passed
            if (start_date.getTime() < Date.now() || end_date.getTime() < Date.now()) {
                next_day.setDate(next_day.getDate() + 7);
                start_date = new Date(next_day.getTime() + conversions.convertTimeToMS(startTime));
                end_date = new Date(next_day.getTime() + conversions.convertTimeToMS(endTime));
            }

            console.log("Next_day get time: " + next_day.getTime() + " LocaleTimeString: " + next_day.toLocaleString());
            console.log("Start Date: " + start_date.toLocaleString());
            console.log("End Date: " + end_date.toLocaleString());

            var schedulingTime = new Date(start_date.getTime() + this.randomTime(start_date, end_date));

            console.log("Insert into notification table");
            //insert into notification database
            $cordovaSQLite.execute(db, query, [day, startTime, endTime, schedulingTime.getTime()]).then(function(res) {
                console.log("Insert into NotificationTable Complete ID: " + res.insertId);
            }, function(err) {
                console.error("Error From NotificationTable Insert: " + err);
            });

            //CHANGED HERE
            //add notification to notification center
            this.addLocalNotification(schedulingTime, day, startTime, endTime);

            next_day.setDate(next_day.getDate() + 7);
            console.log("Next Day: " + next_day);
        }
    }

    //schedules more local notifications for a block when there are no more notifications scheduled
    this.scheduleLNScope = function(db, day, startTime, endTime) {
        $cordovaSQLite.execute(db, "SELECT * FROM NotificationTable WHERE day = ? AND starthour = ? AND endhour = ?", [day, startTime, endTime]).then(function(res) {
            if (res.rows.length == 0) {
                console.log("Notifications ran out");
                self.scheduleLNForBlock(db, day, startTime, endTime);
            }
        });
    }
}])

.service('meamlogin', ['$rootScope', '$http', '$cordovaSQLite', 'err_hand', function($rootScope, $http, $cordovaSQLite, err_hand) {
    this.login = function(inputUser, inputPassword) {
        var loginData = {
            username: inputUser,
            password: inputPassword,
            isMobile: true
        }

        httpRequest = $http({
            method: 'GET',
            url: hostURL + "accounts/login/",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: objToUrlParam(loginData),
            timeout: 3000
        });

        httpRequest.success(function(res) {
            var token = res.split("csrfmiddlewaretoken")[1].split('\'')[2];
            $http({
                method: 'POST',
                url: hostURL + "meamstream/api/login/",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: objToUrlParam(loginData)
            }).success(function(res) {
                $rootScope.sessionID = res.sessionid;
                console.log($rootScope.sessionID);
                //save user and password into table
                $cordovaSQLite.execute(db, "INSERT OR REPLACE INTO pref (variable, val) VALUES ('loginBool',1)");
                $cordovaSQLite.execute(db, "INSERT OR REPLACE INTO accountInfo (variable, val) VALUES ('user',?)", [inputUser]);
                $cordovaSQLite.execute(db, "INSERT OR REPLACE INTO accountInfo (variable, val) VALUES ('pass',?)", [inputPassword]);
                
                alert("Successfully logged in as " + inputUser);
                $rootScope.username = inputUser;
            }).error(function(err) {
                err_hand.errPopup("Invalid Login");
                //alert("Invalid Login");
            })
        })
        
        httpRequest.error(function(res){
            err_hand.errPopup("Server Request Timeout");
        });
    }

    this.logout = function() {
        cordova.plugins.Keyboard.close();
        $rootScope.sessionID = null;
        $cordovaSQLite.execute(db, "INSERT OR REPLACE INTO pref (variable, val) VALUES ('loginBool',0)");
    }
}]);