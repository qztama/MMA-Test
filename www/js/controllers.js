//var sessionID = "";
//var hostURL = "http://meamdev.ucdavis.edu:8000/";

var objToUrlParam = function(obj) {
  return Object.keys(obj).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
  }).join('&');
}

angular.module('app.controllers', ['app.services'])
  .controller('loginCtrl', function($scope, $http, $cordovaSQLite, meamlogin) {

    $scope.$on('$ionicView.loaded', function() {
      
    })

    $scope.changeHosts = function(newHost) {
      var query = "INSERT OR REPLACE INTO accountInfo (variable, val) VALUES (\"hosturl\", \"" + newHost + "\")";
      $cordovaSQLite.execute(db, query);
      hostURL = newHost;
      alert('New host set to: ' + hostURL);
    }

    $scope.login = meamlogin.login;
    $scope.logout = meamlogin.logout;
  })

.controller('signupCtrl', function($scope) {

})

.controller('settingsCtrl', function($scope, $rootScope, $http, $ionicPopup, $cordovaSQLite, $ionicLoading,$state, err_hand) {
  $scope.curSong = {};
  $scope.playButtonText = "Pause"

  $scope.$on('$ionicView.loaded', function() {
    

    var query = "SELECT * FROM pref WHERE variable = \"advOpt\"";
    $cordovaSQLite.execute(db, query, []).then(function(res) {
      if (res.rows.length > 0) {
        $scope.bShowOptional = res.rows.item(0).val == 1 ? true : false;
      } else {
        console.log("No results found");
      }
    }, function(err) {
      console.error(err);
    });
  });


  $scope.show = function() {
  
    $ionicLoading.show({
      template: '<p>Loading...</p><ion-spinner></ion-spinner>'
    });
  };

  $scope.hide = function(){
        $ionicLoading.hide();
  };

  $scope.syncPref = function(b) {
    var my_val = +b;
    var query = "INSERT OR REPLACE INTO pref (variable, val) VALUES (?,?)";
    $cordovaSQLite.execute(db, query, ["advOpt", my_val]);
  }

  $scope.getNewSong = function() {
    if ($scope.curPlaying) {
      $scope.audio.pause();
    }

    var user = {
      "sessionid": $rootScope.sessionID
    }

 // Start showing the progress
    $scope.show($ionicLoading);


    var httpRequest;
    httpRequest = $http({
      method: 'GET',
      url: hostURL + "meamstream/songinfo/",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 3000,
      data: objToUrlParam(user)
    });

    httpRequest.success(function(res) {
      console.log(res);
      $scope.curSong = res;
      $scope.audio = new Audio($scope.curSong.previewURL);
      $scope.audio.loop = false;
      $scope.audio.play();
      $scope.curPlaying = true;
    });

    httpRequest.error(function(err) {
      err_hand.errPopup("Song Request Failed: Timeout");
    });

    httpRequest.finally(function($ionicLoading) { 
      // On both cases hide the loading
      $scope.hide($ionicLoading);  
    });
  }

  $scope.$on('$ionicView.beforeEnter', function() {
    if ($rootScope.sessionID){
    $scope.getNewSong();
    }
    else{
      $state.go('tabsController.login', {reload: true});
    }
  })

  $scope.$on('$ionicView.leave', function() {
    $scope.audio.pause();
  })

  $scope.toggleSongPlayback = function() {
    if ($scope.curPlaying && $scope.audio) {
      $scope.audio.pause();
      $scope.playButtonText = "Play";
    } else {
      $scope.audio.play();
      $scope.playButtonText = "Pause";
    }
    $scope.curPlaying = !$scope.curPlaying;
  }

  $scope.clearResponseFields = function(response) {
    console.log($scope.response);
    response.memory = "";
    response.personType = "";
    response.eventType = "";
    response.placeType = "";
    response.emotionType = "";
  }
  $scope.submitResponse = function(response) {
    var resp = JSON.parse(JSON.stringify(response));
    var confirmPopup = $ionicPopup.confirm({
      title: 'Are you sure?',
      template: 'Are you sure you would like to submit this response?',
      okText: 'Yes, submit',
      cancelText: 'No, cancel'
    });

    confirmPopup.then(function(res) {
      if (res) {
        console.log('You are sure');
        $scope.submitResponse_(resp);
      } else {
        console.log('You are not sure');
      }
    });
  }

  $scope.submitResponse_ = function(response) {
    if (!response) {
      alert("invalid input");
      return
    }
    console.log($scope.response)
    console.log(response);
    response.sessionid = $rootScope.sessionID;
    response.songid = $scope.curSong.songid;
    response.class = "memory";
    response.isMobile = true;

    function removeNull(element, index, array) {
      if (this[element] == "") {
        delete this[element];
      }
    }
    (Object.getOwnPropertyNames(response)).forEach(removeNull, response);
    console.log(response);
    $http({
      method: 'POST',
      url: hostURL + "meamstream/mobile_remember/",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: objToUrlParam(response)
    }).success(function(res) {
      console.log(res);
      var confirmPopup = $ionicPopup.confirm({
        title: 'Submitted Music Memento Moment',
        template: 'Submitted! Would you like another Music Memento Moment now?',
        okText: 'Yes, play me another',
        cancelText: 'No, I am done for now'
      });

      confirmPopup.then(function(res) {
        if (res) {
          console.log('You are sure');
          $scope.getNewSong();
        } else {
          console.log('You are not sure');
        }
      });

    }).error(function(err) {
      console.log("err");

    })
  }
})

.controller('CalendarCtrl', function($scope, $rootScope, $window, $ionicScrollDelegate, $ionicPopup, $cordovaSQLite,$state, $cordovaLocalNotification, scheduleLocalNotifications, conversions) {

  var startHour = 0;
  var endHour = 24;
  var usehalfhour = false;

  //css measurements in pixels
  var session_block_height = 25;
  var session_block_width = 100;
  var time_label_width = 60;

  $scope.timerleft = '0px';
  $scope.windowWidth = $window.innerWidth + 'px';
  $scope.but_top = ($window.innerHeight - 25) + 'px';

  $scope.hours = getHours();
  $scope.days = getDays();
  $scope.events = [];

  function getHours() {
    var tmp = [];
    for (i = startHour; i <= endHour; i++) {
      tmp.push(('0' + i).slice(-2) + ':00');
      if (usehalfhour && i < endHour) {
        tmp.push(('0' + i).slice(-2) + ':30');
      }
    }

    return tmp;
  };

  $scope.$on('$ionicView.beforeEnter', function() {
    if (!$rootScope.sessionID){
      $state.go('tabsController.login', {reload: true});
    }
  
  })

  function getNumWeekdays() {
    var weekday = {};
    weekday["Sunday"] = 0;
    weekday["Monday"] = 1;
    weekday["Tuesday"] = 2;
    weekday["Wednesday"] = 3;
    weekday["Thursday"] = 4;
    weekday["Friday"] = 5;
    weekday["Saturday"] = 6;
    return weekday;
  };

  function getDays() {
    var weekday = new Array(7);
    weekday[0] = "Sunday";
    weekday[1] = "Monday";
    weekday[2] = "Tuesday";
    weekday[3] = "Wednesday";
    weekday[4] = "Thursday";
    weekday[5] = "Friday";
    weekday[6] = "Saturday";
    return weekday;
  };

  function padZeroes(num) {
    if (num < 10) {
      return '0' + num.toString();
    }

    return num.toString();
  };

  $scope.deleteEvent = function(day, start_hour, end_hour) {
    var confirmPopup = $ionicPopup.confirm({
      title: day + ' ' + start_hour + '-' + end_hour,
      template: 'Are you sure you want to delete this block?',
      okText: 'Yes',
      cancelText: 'Cancel'
    });

    confirmPopup.then(function(res) {
      if (res) {
        console.log("INSIDE DELETE EVENT");
        console.log("Day: " + day + " starthour: " + start_hour + " endhour: " + end_hour);
        var ui_query = "DELETE FROM schedule WHERE day = ? AND starthour = ? AND endhour = ?";
        $cordovaSQLite.execute(db, ui_query, [day, start_hour, end_hour]);

        console.log("Schedule Table Results");
        var test_query = "SELECT * FROM schedule";
        $cordovaSQLite.execute(db, test_query).then(function(res) {
          for (i = 0; i < res.rows.length; i++) {
            console.log(res.rows.item(i));
          }
        });

        //console.log($scope.events.length);

        for (var i = 0; i < ($scope.events).length; i++) {
          if ($scope.events[i]["day"] == day && $scope.events[i]["starthour"] == start_hour && $scope.events[i]["endhour"] == end_hour) {
            $scope.events.splice(i, 1);
            break;
          }
        }

        cordova.plugins.notification.local.getIds(function(ids) {
          console.log("IDs HERE: ");
          console.log(ids);
        }, cordova.plugins);

        var be_del_query = "DELETE FROM NotificationTable WHERE day = ? AND starthour = ? AND endhour = ?";
        var be_del_notif_query = "SELECT * FROM NotificationTable WHERE day = ? AND starthour = ? AND endhour = ?";

        //grab all notifications associated with the block
        $cordovaSQLite.execute(db, be_del_notif_query, [day, start_hour, end_hour]).then(function(res) {
          console.log("Inside be_del_notif_query");
          console.log(res.rows);
          if (res.rows.length > 0) {
            //delete notifications from notification center
            for (var i = 0; i < res.rows.length; i++) {
              console.log(res.rows.item(i));
              cordova.plugins.notification.local.cancel(res.rows.item(i).notifID, function() {
                console.log("Cancellation Complete");
              });
            }
          }
          console.log("after be_del_notif_query");

          //clear the NotificationTable
          $cordovaSQLite.execute(db, be_del_query, [day, start_hour, end_hour]);
        });
      }
    });
  }

  $scope.gotScrolled = function() {

    $scope.timerleft = $ionicScrollDelegate.getScrollPosition().left + 'px';
    $scope.$apply();

  };

  $scope.insertEvent = function(day, start_hour, end_hour, left_pos, top_pos, block_height, color) {
    //console.log("inside insert Event");
    //console.log('top_pos ' + top_pos);
    //console.log('block_height ' + block_height);
    //console.log('color ' + color);
    var query = "INSERT INTO schedule (day, starthour, endhour, left, block_color, block_top, block_height) VALUES (?,?,?,?,?,?,?)";
    $cordovaSQLite.execute(db, query, [day, start_hour, end_hour, left_pos, color, top_pos, block_height]).then(function(res) {
      console.log("Insert Event Complete. ID: " + res.insertId);
      console.log("inside execute");
    }, function(err) {
      console.error(err);
    });
  };

  $scope.selectEvents = function() {
    var query = "SELECT * FROM schedule";
    $cordovaSQLite.execute(db, query, []).then(function(res) {
      if (res.rows.length > 0) {
        //console.log("SELECTED -> " + res.rows.item(0).day);
        //console.log(res.rows.item(0));

        for (var i = 0; i < res.rows.length; i++) {
          var obj = {
            day: res.rows.item(i).day,
            starthour: res.rows.item(i).starthour,
            endhour: res.rows.item(i).endhour,
            left: res.rows.item(i).left,
            top: res.rows.item(i).block_top,
            height: res.rows.item(i).block_height,
            color: res.rows.item(i).block_color
          };

          //console.log(obj);
          $scope.events.push(obj);
        }
      } else {
        console.log("No results found");
      }
    }, function(err) {
      console.error(err);
    });
  };

  function loadSessionBlock() {
    $scope.selectEvents();
  };

  loadSessionBlock();

  $scope.addEvent = function(day, start_hour, end_hour) {
    //calculate positions of session block
    var left_pos = time_label_width + getNumWeekdays()[day] * session_block_width;
    var top_pos = Math.round(23 + (conversions.convertTimeToNum(start_hour) - 1) * session_block_height);
    var block_height = Math.round(session_block_height * (conversions.convertTimeToNum(end_hour) - conversions.convertTimeToNum(start_hour)));
    var block_color = 'rgba(0,157,151,0.75)';

    top_pos = top_pos.toString();
    block_height = block_height.toString();
    console.log("top pos here:");
    console.log(top_pos.toString());
    console.log(block_height.toString());

    //save to local persistent storage
    var eventId = $scope.insertEvent(day, start_hour, end_hour, left_pos.toString() + 'px', top_pos + 'px', block_height + 'px', block_color);

    //add to the ui
    $scope.events.push({
      day: day,
      starthour: start_hour,
      endhour: end_hour,
      left: left_pos + 'px',
      top: top_pos + 'px',
      height: block_height + 'px',
      color: 'rgba(0,157,151,0.75)'
    });
  }

  $scope.onAddAvailability = function() {
    $scope.eventTime = {};
    $ionicPopup.show({
      template: 'Weekday: <br> <select class="ion-input-select--large" ng-model="eventTime.day"><option>Sunday</option><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option></select></br>Start Time: <input type="time" ng-model="eventTime.start"> End Time: <input type="time" ng-model="eventTime.end">',
      title: 'Time availability',
      scope: $scope,
      buttons: [{
        text: 'Cancel'
      }, {
        text: '<b>Apply</b>',
        type: 'button-positive',
        onTap: function(e) {
          if ($scope.eventTime.start && $scope.eventTime.end && $scope.eventTime.day) {
            return {
              day: $scope.eventTime.day,
              startTime: $scope.eventTime.start,
              endTime: $scope.eventTime.end
            };
          } else {
            e.preventDefault();
          }
        }
      }]
    }).then(function(res) {
      if (res == null) {
        alert("Cancelled");
      }
      $scope.selectEvents();
      var mil_start_time = "" + res.startTime.getHours() + ":" + padZeroes(res.startTime.getMinutes());
      var mil_end_time = "" + res.endTime.getHours() + ":" + padZeroes(res.endTime.getMinutes());
      $scope.addEvent(res.day, mil_start_time, mil_end_time);

      console.log("Schedule LN for Block");
      scheduleLocalNotifications.scheduleLNForBlock(db, res.day, mil_start_time, mil_end_time);
    });
  };
})