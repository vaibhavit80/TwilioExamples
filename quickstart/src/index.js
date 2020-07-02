'use strict';

const { isMobile, getUrlParams } = require('./browser');
const joinRoom = require('./joinroom');
const micLevel = require('./miclevel');
const selectMedia = require('./selectmedia');
const selectRoom = require('./selectroom');
const showError = require('./showerror');
const { jwt: { AccessToken } } = require('twilio');
const axios = require('axios');

const VideoGrant = AccessToken.VideoGrant;

const $modals = $('#modals');
const $selectMicModal = $('#select-mic', $modals);
const $selectCameraModal = $('#select-camera', $modals);
const $showErrorModal = $('#show-error', $modals);
const $joinRoomModal = $('#join-room', $modals);
const $guestlinkmodal = $('#guestlinkmodal', $modals);


const $meetinginthepast = $('#meetinginthepast', $modals);


var warningMessageDisplayed30Min = false;
var warningMessageDisplayed33Min = false;
var warningMessageDisplayed35Min = false;
var warningMessageDisplayed36Min = false;
var timerStarted = false;
var setTimerInterval;
// ConnectOptions settings for a video web application.
const connectOptions = {
  // Available only in Small Group or Group Rooms only. Please set "Room Type"
  // to "Group" or "Small Group" in your Twilio Console:
  // https://www.twilio.com/console/video/configure
  bandwidthProfile: {
    video: {
      dominantSpeakerPriority: 'high',
      mode: 'collaboration',
      renderDimensions: {
        high: { height: 720, width: 1280 },
        standard: { height: 90, width: 160 }
      }
    }
  },

  // Available only in Small Group or Group Rooms only. Please set "Room Type"
  // to "Group" or "Small Group" in your Twilio Console:
  // https://www.twilio.com/console/video/configure
  dominantSpeaker: true,

  // Comment this line to disable verbose logging.
  logLevel: 'debug',

  // Comment this line if you are playing music.
  maxAudioBitrate: 16000,

  // VP8 simulcast enables the media server in a Small Group or Group Room
  // to adapt your encoded video quality for each RemoteParticipant based on
  // their individual bandwidth constraints. This has no utility if you are
  // using Peer-to-Peer Rooms, so you can comment this line.
  preferredVideoCodecs: [{ codec: 'VP8', simulcast: true }],

  // For desktop browsers, capture 720p video @ 24 fps.
  video: { height: 720, frameRate: 24, width: 1280 }
};

// For mobile browsers, limit the maximum incoming video bitrate to 2.5 Mbps.
if (isMobile) {
  connectOptions
    .bandwidthProfile
    .video
    .maxSubscriptionBitrate = 2500000;
}

// On mobile browsers, there is the possibility of not getting any media even
// after the user has given permission, most likely due to some other app reserving
// the media device. So, we make sure users always test their media devices before
// joining the Room. For more best practices, please refer to the following guide:
// https://www.twilio.com/docs/video/build-js-video-application-recommendations-and-best-practices
const deviceIds = {
  audio: isMobile ? null : localStorage.getItem('audioDeviceId'),
  video: isMobile ? null : localStorage.getItem('videoDeviceId')
};


/**
 * Select your Room name, your screen name and join.
 * @param [error=null] - Error from the previous Room session, if any
 */
async function selectAndJoinRoom(error = null) {
  const params = getUrlParams();

  if (!error && params.contactguid && params.adminguid) {
    try {
   

      fetch(`https://apiprod.iconnections.io/f4f/contacttestadmin/${params.contactguid}/${params.adminguid}`)
        .then(async (response) => {
        
            var tt = await response.json();

            // Add the specified audio device ID to ConnectOptions.
            connectOptions.audio = { deviceId: { exact: deviceIds.audio } };

            // Add the specified Room name to ConnectOptions.
            connectOptions.name = tt.RoomName;

            // Add the specified video device ID to ConnectOptions.
            connectOptions.video.deviceId = { exact: deviceIds.video };
            debugger;
            await joinRoom(tt.TwilioToken, connectOptions);


        })
        .catch((error) => {
          console.error(error);
        });



    }
    catch (error) {
      //return selectAndJoinRoom(error);
    }
  }
  else if (!error && params.contactguid && params.meetingguid) {
    try {
      fetch(`https://apiprod.iconnections.io/f4f/meetingcontact/${params.contactguid}/${params.meetingguid}`)
        .then(async (response) => {
                  
            var tt = await response.json();


            console.log(tt);
            
            //First Make sure the meeting isn't in the past:
            if(tt.MeetingInThePast) {
              $meetinginthepast.modal("show");             
              return false;
            }
            



            //-----------------------------------------------------------------------
            $("#btnInvite").show();
            $("#btnInvite").click((e) => {
                          
              var guidVal = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
              );
              
              var videoGuestURL = `https://video.iconnections.io/?guestguid=${guidVal}&meetingguid=${params.meetingguid}`;                            
              $("#spMeetingLink").val(videoGuestURL);
              $guestlinkmodal.modal('show');                                        

            });//$("#btnInvite").click((e) => {
              $("#spMeetingLink").click((e) => {
                                       
                $(this).focus();
                $(this).select();
                document.execCommand('copy');                                    
  
              });//$("#btnInvite").click((e) => {
            //-----------------------------------------------------------------------
            // Add the specified audio device ID to ConnectOptions.
            connectOptions.audio = { deviceId: { exact: deviceIds.audio } };

            // Add the specified Room name to ConnectOptions.
            connectOptions.name = tt.RoomName;

            // Add the specified video device ID to ConnectOptions.
            connectOptions.video.deviceId = { exact: deviceIds.video };

            //var dateStart = new Date();
            //dateStart.setMinutes( dateStart.getMinutes() + 1);
            $('#meetingStartTime').val(tt.LocalStartDateTime);
            debugger;
            await joinRoom(tt.TwilioToken, connectOptions); 

        })
        .catch((error) => {
          console.error(error);
        });
    }
    catch (error) {
      //return selectAndJoinRoom(error);
    }
  }
  else if (!error && params.guestguid && params.meetingguid) {
    try {
   
      fetch(`https://apiprod.iconnections.io/f4f/guestcontact/${params.guestguid}/${params.meetingguid}`)
        .then(async (response) => {
                  
            var tt = await response.json();


            
            //First Make sure the meeting isn't in the past:
            if(tt.MeetingInThePast) {
              $meetinginthepast.modal("show");             
              return false;
            }


            // Add the specified audio device ID to ConnectOptions.
            connectOptions.audio = { deviceId: { exact: deviceIds.audio } };

            // Add the specified Room name to ConnectOptions.
            connectOptions.name = tt.RoomName;

            // Add the specified video device ID to ConnectOptions.
            connectOptions.video.deviceId = { exact: deviceIds.video };
            debugger;
            await joinRoom(tt.TwilioToken, connectOptions);
        })
        .catch((error) => {
          console.error(error);
        });
    }
    catch (error) {
      //return selectAndJoinRoom(error);
    }
  }
  else if (!error && params.contactguid) {
    try {
   
      $("#testingvideomodal").modal("show");


      fetch(`https://apiprod.iconnections.io/f4f/contacttest/${params.contactguid}`)
        .then(async (response) => {
        
            var tt = await response.json();

            // Add the specified audio device ID to ConnectOptions.
            connectOptions.audio = { deviceId: { exact: deviceIds.audio } };

            // Add the specified Room name to ConnectOptions.
            connectOptions.name = tt.RoomName;

            // Add the specified video device ID to ConnectOptions.
            connectOptions.video.deviceId = { exact: deviceIds.video };
            debugger;
            await joinRoom(tt.TwilioToken, connectOptions);
        })
        .catch((error) => {
          console.error(error);
        });
    }
    catch (error) {
      //return selectAndJoinRoom(error);
    }
  }
  else if (!error && params.token) {
    try {

      /**
      const response = await fetch(`access?token=${params.token}`);
      const access = await response.json();

      // Add the specified audio device ID to ConnectOptions.
      connectOptions.audio = { deviceId: { exact: deviceIds.audio } };

      // Add the specified Room name to ConnectOptions.
      connectOptions.name = access.room;

      // Add the specified video device ID to ConnectOptions.
      connectOptions.video.deviceId = { exact: deviceIds.video };

      await joinRoom(access.token, connectOptions);

      **/


      //alert('test')


      fetch(`https://apiprod.iconnections.io/f4f/token/${params.token}`)
        .then(async (response) => {
        
            var tt = await response.json();

            // Add the specified audio device ID to ConnectOptions.
            connectOptions.audio = { deviceId: { exact: deviceIds.audio } };

            // Add the specified Room name to ConnectOptions.
            connectOptions.name = tt.RoomName;

            // Add the specified video device ID to ConnectOptions.
            connectOptions.video.deviceId = { exact: deviceIds.video };
            debugger;
            await joinRoom(tt.TwilioToken, connectOptions);

        })
        .catch((error) => {
          console.error(error);
        });
    }
    catch (error) {
      //return selectAndJoinRoom(error);
    }
  }
  else {
       //const formData = await selectRoom($joinRoomModal, error);
      
      // if (!formData) {
      //   // User wants to change the camera and microphone.
      //   // So, show them the microphone selection modal.
      //   deviceIds.audio = null;
      //   deviceIds.video = null;
      //   return selectMicrophone();
      // }
      // const { identity, roomName } = formData;

      try {
      //   // Fetch an AccessToken to join the Room.
      //   const response = await fetch(`/token?identity=${identity}`);

      //   // Extract the AccessToken from the Response.
      //   const token = await response.text();

      //   // Add the specified audio device ID to ConnectOptions.
      //   connectOptions.audio = { deviceId: { exact: deviceIds.audio } };

      //   // Add the specified Room name to ConnectOptions.
      //   connectOptions.name = roomName;

      //   // Add the specified video device ID to ConnectOptions.
      //   connectOptions.video.deviceId = { exact: deviceIds.video };

      //   // Join the Room.
      //   await joinRoom(token, connectOptions);

      //   // After the video session, display the room selection modal.
      //   return selectAndJoinRoom();
    } catch (error) {
      //return selectAndJoinRoom(error);
    }
  }
}

function setTimer()
{
  try {
    if($('#meetingStartTime').val() != '' && !timerStarted)
    {      
     
      
      let currentDateTime = new Date();         
      var meetingStartTime = new Date($('#meetingStartTime').val());
      clearInterval(setTimerInterval);
      if(currentDateTime >= meetingStartTime) { 
        let initHour = 0;
        let initMinute = Math.round(getTimerMinutesDifference(currentDateTime, meetingStartTime));
        startTimer(initHour, initMinute);   
      } else {
        setInterval(function() {
          checkAndRunTimer(meetingStartTime);
        }, 3000);
      }  
    }
  }
  catch(error) {
    console.error(error);
  }
}

function checkAndRunTimer(meetingStartTime) {  
 
  
  let currentDateTime = new Date(); 
  if(currentDateTime >= meetingStartTime)  {
    let initHour = 0;
    let initMinute = Math.round(getTimerMinutesDifference(currentDateTime, meetingStartTime));
    startTimer(initHour, initMinute);
  }
}

function startTimer(initHour, initMinute) {
 
  

  $('.timer').countimer({
    useHours: false,
    initHours: initHour,
    initMinutes: initMinute,
    secondIndicator: '',
    enableEvents: true
  }).on('minute', function(evt, time){


    
    /**
    if(time.original.minutes >= 40 && !warningMessageDisplayed30Min) {       
      warningMessageDisplayed30Min = true;
      $("#timerMessageContent").html('The meeting will conclude in 5 minutes.');
      $("#timerMessageModal").modal("show");  
    }
    if(time.original.minutes >= 43 && !warningMessageDisplayed33Min) {
      warningMessageDisplayed33Min = true;
      $("#timerMessageContent").html('The meeting will conclude in 2 minutes. If you would like to connect outside of the system please exchange contacts details.');
      $("#timerMessageModal").modal("show"); 
    }
    if(time.original.minutes >= 45 && !warningMessageDisplayed35Min) {
      warningMessageDisplayed35Min = true;
      $("#timerMessageContent").html('The meeting will automatically conclude in 60 seconds.');
      $("#timerMessageModal").modal("show"); 
      $('#endTimer').removeClass('endTimerHidden');
      $('#endTimer').addClass('blinking');
      $('#endTimer').css("font-color","red");
      $('#endTimer').css("font-size","x-large");
      setInterval(function() {
          var time = $('#endTimer').html();
          if(time > 0) {          
            time = time - 1;
            $('#endTimer').html(time);
          }
          else{
            $("#timerMessageModal").modal("hide"); 
          }
      }, 1000);      
    }
    if(time.original.minutes >= 46 && !warningMessageDisplayed36Min) {       
      $('#participants').html('');
      $('.timer').countimer('stop');
      $('#btnConfirmRemoveUpload').trigger('click');
    }
    */

  });
  timerStarted = true;
}

function getTimerMinutesDifference(startDate, endDate) {  
 
  var diffInMs = endDate - startDate;
  var diffSeconds = diffInMs / 1000;
  return Math.abs(diffSeconds/60);

}

function getTimerSecondsDifference(startDate, endDate) {
 
  
    var diffInMs = endDate - startDate;
    var diffSeconds = diffInMs / 1000;
    return Math.abs(diffSeconds % 60);
    
}

/**
 * Select your camera.
 */
async function selectCamera() {
  if (deviceIds.video === null) {
    try {
      deviceIds.video = await selectMedia('video', $selectCameraModal, stream => {
        const $video = $('video', $selectCameraModal);
        $video.get(0).srcObject = stream;
      });
    } catch (error) {
      showError($showErrorModal, error);
      return;
    }
  }
  return selectAndJoinRoom();
}

/**
 * Select your microphone.
 */
async function selectMicrophone() {
  if (deviceIds.audio === null) {
    try {
      deviceIds.audio = await selectMedia('audio', $selectMicModal, stream => {
        const $levelIndicator = $('svg rect', $selectMicModal);
        const maxLevel = Number($levelIndicator.attr('height'));
        micLevel(stream, maxLevel, level => $levelIndicator.attr('y', maxLevel - level));
      });
    } catch (error) {
      showError($showErrorModal, error);
      return;
    }
  }
  return selectCamera();
}

window.addEventListener('load', selectMicrophone);

/**
 * Select your camera.
 */
async function selectCameraManually() {
  //if (deviceIds.video === null) {
    try {
      deviceIds.video = await selectMedia('video', $selectCameraModal, stream => {
        const $video = $('video', $selectCameraModal);
        $video.get(0).srcObject = stream;
      });
    } catch (error) {
      showError($showErrorModal, error);
      return;
    }
  //}
  return selectAndJoinRoom();
}

/**
 * Select your microphone.
 */
async function selectMicrophoneManually() {
  //if (deviceIds.audio === null) {
    try {
      deviceIds.audio = await selectMedia('audio', $selectMicModal, stream => {
        const $levelIndicator = $('svg rect', $selectMicModal);
        const maxLevel = Number($levelIndicator.attr('height'));
        micLevel(stream, maxLevel, level => $levelIndicator.attr('y', maxLevel - level));
      });
    } catch (error) {
      showError($showErrorModal, error);
      return;
    }
  //}
  return selectCameraManually();
}

$(document).ready(function () { 
  fetch('https://apiprod.iconnections.io/general/sponsorlogos')
  //fetch('http://localhost:55767/general/sponsorlogos')
    .then(async (response) => {
      let sponsors = await response.json();            
      for (let sponsor of sponsors) {
        $("#scroller").append(`<li><a style="margin-left: 20px;" href="${sponsor.Website}" target="_blank" title="${sponsor.Name}"><img class="img-fluid" style="max-height: 175px; max-width: 175px;" src="${encodeURI(sponsor.ImageURL)}"></a></li>`);
      }
      $("#scroller").simplyScroll();   
    })
    .catch((error) => {
      console.error(error);
    });

    $("#btnChangeCamera").click(function() {
      selectMicrophoneManually();
    });

    $("#btnDismissMeetingInPast").click(function() {
      window.location.href = "https://app.iconnections.io/Home/Dashboard";
      return false;
    });
   
    setTimerInterval = setInterval(function() {
      setTimer();
    }, 3000);

    $("#copyimage").click(function() {
      $("#spMeetingLink").select();
      document.execCommand('copy');
    });
    
    $("#copyLabel").click(function() {
      $("#spMeetingLink").select();
      document.execCommand('copy');
    });
});