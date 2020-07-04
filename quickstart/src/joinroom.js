'use strict';

const { connect, createLocalVideoTrack, LocalVideoTrack } = require('twilio-video');
const { isMobile,getUrlParams } = require('./browser');
const $leave = $('#leave-room');
const $screenshare = $('#screen-share');
const $videoshare = $('#video-share');
const $chatroom = $('#chat-room');
var tc = {};

var GENERAL_CHANNEL_UNIQUE_NAME = 'general';
var GENERAL_CHANNEL_NAME = 'General Channel';
var MESSAGES_HISTORY_LIMIT = 50;
var $messageList;
var $channelList;
var showNotification = false;
var chatOpen = false;
var msgCont = 0;
var $inputText;
var $usernameInput;
var $statusRow;
var $connectPanel;
var $newChannelInputRow;
var $newChannelInput;
var $typingRow;
var $typingPlaceholder;
const $audioshare = $('#audio-share');
const $room = $('#room');
const $activeParticipant = $('div#active-participant > div.participant.main', $room);
const $activeVideo = $('video', $activeParticipant);
const $participants = $('div#participants', $room);
const $discon =$('#discon');
const $modals = $('#modals');
const $leaveroomconfirm = $('#leaveroomconfirm', $modals);
const $btnConfirmRemoveUpload = $('#btnConfirmRemoveUpload', $leaveroomconfirm);


// The current active Participant in the Room.
let activeParticipant = null;

// Whether the user has selected the active Participant by clicking on
// one of the video thumbnails.
let isActiveParticipantPinned = false;

// store the selected fullscreen pax sid
let fullscreen_sid = null;

/**
 * Set the active Participant's video.
 * @param participant - the active Participant
 */
function setActiveParticipant(participant) {
  if (activeParticipant) {
    const $activeParticipant = $(`div#${activeParticipant.sid}`, $participants);
    $activeParticipant.removeClass('active');
    $activeParticipant.removeClass('pinned');

    // Detach any existing VideoTrack of the active Participant.
    const { track: activeTrack } = Array.from(activeParticipant.videoTracks.values())[0] || {};
    if (activeTrack) {
      activeTrack.detach($activeVideo.get(0));
      $activeVideo.css('opacity', '0');
    }
  }

  // Set the new active Participant.
  activeParticipant = participant;
  const { identity, sid } = participant;
  const $participant = $(`div#${sid}`, $participants);

  $participant.addClass('active');
  if (isActiveParticipantPinned) {
    $participant.addClass('pinned');
  }

  // Attach the new active Participant's video.
  const { track } = Array.from(participant.videoTracks.values())[0] || {};
  if (track) {
    track.attach($activeVideo.get(0));
    $activeVideo.css('opacity', '');
  }

  // Set the new active Participant's identity
  $activeParticipant.attr('data-identity', identity);
}

/**
 * Set the current active Participant in the Room.
 * @param room - the Room which contains the current active Participant
 */
function setCurrentActiveParticipant(room) {
  const { dominantSpeaker, localParticipant } = room;
  //setActiveParticipant(dominantSpeaker || localParticipant);
}

/**
 * Set up the Participant's media container.
 * @param participant - the Participant whose media container is to be set up
 * @param room - the Room that the Participant joined
 */
function setupParticipantContainer(participant, room) {
  const { identity, sid } = participant;

  // Add a container for the Participant's media.
  const $container = $(`<div class="participant p-2 col-xs-12 col-md-6" data-identity="${identity} - Click Video To Enlarge" id="${sid}">

    <audio autoplay ${participant === room.localParticipant ? 'muted' : ''} style="opacity: 0"></audio>
    <video autoplay muted playsinline style="opacity: 0"></video>
    <div class="video-overlay">
      <div class="video-controls d-flex flex-row-reverse bg-dark">
        <span class="px-1 pax-fs-indicator">
          <i class="fas fa-expand fa-sm text-light"></i>
        </span>
        <span class="px-1 pax-audio-indicator">
          <i class="fas fa-microphone-slash fa-sm text-danger"></i>
        </span>
      </div>
    </div>
  </div>`);

  $container.click((e) => {
    let myRoom = room;
    $(e.currentTarget).removeClass(function (index, className) {
      return (className.match(/(^|\s)col-\S+/g)).join(' ');
    }).addClass('col-12');

    if (fullscreen_sid === sid) {
      fullscreen_sid = null;
    }
    else {
      fullscreen_sid = sid;
    }
    updateParticipantContainers(myRoom);
  });

  // Toggle the pinning of the active Participant's video.
  /*
  $container.on('click', () => {
    if (activeParticipant === participant && isActiveParticipantPinned) {
      // Unpin the RemoteParticipant and update the current active Participant.
      setVideoPriority(participant, null);
      isActiveParticipantPinned = false;
      setCurrentActiveParticipant(room);
    } else {
      // Pin the RemoteParticipant as the active Participant.
      if (isActiveParticipantPinned) {
        setVideoPriority(activeParticipant, null);
      }
      setVideoPriority(participant, 'high');
      isActiveParticipantPinned = true;
      setActiveParticipant(participant);
    }
  });
  */
  // Add the Participant's container to the DOM.
  $participants.append($container);

  updateParticipantContainers(room);
  
}

function updateParticipantContainers(room) {
  if (fullscreen_sid) {
    let vidMaxHeight = `100%`; 
    let participantHeight ='100%'; 
    $participants.find('div.participant').not(`#${fullscreen_sid}`)
      .hide();
    
    let $fspax = $participants.find(`div.participant#${fullscreen_sid}`);
    $fspax.removeClass(function (index, className) {
      return (className.match(/(^|\s)col-\S+/g)).join(' ');
    }).addClass('col-12').show()
      .find('video').css('max-height', vidMaxHeight);
    $fspax.css('height', participantHeight);

    $fspax.find('.pax-fs-indicator').show();    
  }
  else {
    let numPax = room.participants.size + 1;
    let colClass, vidMaxHeight, participantHeight;

    if (numPax <= 1) {
      colClass = 'col-12';
    }
    else if (numPax <= 4) {
      colClass = 'col-xs-12 col-md-6';
    }
    else if (numPax <= 6) {
      colClass = 'col-xs-12 col-md-4'; 
    }
    else {
      colClass = 'col-xs-12 col-md-3';
    }
    
    participantHeight ='50%';
    if (numPax <= 2) {
      participantHeight = '100%';
    }
    
    let $paxs = $('div.participant');
    $paxs.removeClass(function (index, className) {
      return (className.match(/(^|\s)col-\S+/g)).join(' ');
    }).addClass(colClass).show()
      .find('video')
        .css('max-height', vidMaxHeight);
    $paxs.css('height', participantHeight);
    
    $paxs.find('.pax-fs-indicator').hide();
  }
}

/**
 * Set the VideoTrack priority for the given RemoteParticipant. This has no
 * effect in Peer-to-Peer Rooms.
 * @param participant - the RemoteParticipant whose VideoTrack priority is to be set
 * @param priority - null | 'low' | 'standard' | 'high'
 */
function setVideoPriority(participant, priority) {
  participant.videoTracks.forEach(publication => {
    const track = publication.track;
    if (track && track.setPriority) {
      track.setPriority(priority);
    }
  });
}

/**
 * Attach a Track to the DOM.
 * @param track - the Track to attach
 * @param participant - the Participant which published the Track
 */
function attachTrack(track, participant) {
  // Attach the Participant's Track to the thumbnail.
  const $media = $(`div#${participant.sid} > ${track.kind}`, $participants);
  $media.css('opacity', '');
  track.attach($media.get(0));

  // If the attached Track is a VideoTrack that is published by the active
  // Participant, then attach it to the main video as well.
  if (track.kind === 'video' && participant === activeParticipant) {
    track.attach($activeVideo.get(0));
    $activeVideo.css('opacity', '');
  }

  trackEnabled(track, participant);
}

/**
 * Detach a Track from the DOM.
 * @param track - the Track to be detached
 * @param participant - the Participant that is publishing the Track
 */
function detachTrack(track, participant) {
  // Detach the Participant's Track from the thumbnail.
  const $media = $(`div#${participant.sid} > ${track.kind}`, $participants);
  $media.css('opacity', '0');
  track.detach($media.get(0));


  // If the detached Track is a VideoTrack that is published by the active
  // Participant, then detach it from the main video as well.
  if (track.kind === 'video' && participant === activeParticipant) {
    track.detach($activeVideo.get(0));
    $activeVideo.css('opacity', '0');
  }
}

/**
 * Handle when a track has been enabled/disabled
 * @param {*} track 
 * @param {*} participant 
 */
function trackEnabled(track, participant) {
  if (track.kind === 'audio') {
    let $pax = $participants.find(`#${participant.sid}`);
    let $indicator = $pax.find('.pax-audio-indicator');
    if (track.isEnabled) {
      $indicator.hide();
    }
    else {
      $indicator.show();
    }
  }
  else if (track.kind === 'video') {
    
  }
}

/**
 * Handle the Participant's media.
 * @param participant - the Participant
 * @param room - the Room that the Participant joined
 */
function participantConnected(participant, room) {
  // Set up the Participant's media container.
  fullscreen_sid = null;
  setupParticipantContainer(participant, room);

  // Handle the TrackPublications already published by the Participant.
  participant.tracks.forEach(publication => {
    trackPublished(publication, participant);
  });

  // Handle theTrackPublications that will be published by the Participant later.
  participant.on('trackPublished', publication => {
    trackPublished(publication, participant);
  });
}

/**
 * Handle a disconnected Participant.
 * @param participant - the disconnected Participant
 * @param room - the Room that the Participant disconnected from
 */
function participantDisconnected(participant, room) {
  // If the disconnected Participant was pinned as the active Participant, then
  // unpin it so that the active Participant can be updated.
  if (fullscreen_sid == participant.sid) {
    fullscreen_sid = null;
  }

  if (activeParticipant === participant && isActiveParticipantPinned) {
    isActiveParticipantPinned = false;
    setCurrentActiveParticipant(room);
  }

  // Remove the Participant's media container.
  $(`div#${participant.sid}`, $participants).remove();
  updateParticipantContainers(room);
}

/**
 * Handle to the TrackPublication's media.
 * @param publication - the TrackPublication
 * @param participant - the publishing Participant
 */
function trackPublished(publication, participant) {
  // If the TrackPublication is already subscribed to, then attach the Track to the DOM.
  if (publication.track) {
    attachTrack(publication.track, participant);
  }

  // Once the TrackPublication is subscribed to, attach the Track to the DOM.
  publication.on('subscribed', track => {
    attachTrack(track, participant);
  });

  // Once the TrackPublication is unsubscribed from, detach the Track from the DOM.
  publication.on('unsubscribed', track => {
    detachTrack(track, participant);
  });

  publication.on('trackEnabled', track => {
    console.log('track enabled');
    console.log(track);
    trackEnabled(publication.track, participant);
  });

  publication.on('trackDisabled', track => {
    trackEnabled(publication.track, participant);
  });
}

/**
 * Join a Room.
 * @param token - the AccessToken used to join a Room
 * @param connectOptions - the ConnectOptions used to join a Room
 */
async function joinRoom(token, connectOptions) {
  // Join to the Room with the given AccessToken and ConnectOptions.
  const room = await connect(token, connectOptions);
  tc.init();
  // Save the LocalVideoTrack.
  let localVideoTrack = Array.from(room.localParticipant.videoTracks.values())[0].track;

  // Save the LocalAudioTrack
  let localAudioTrack = Array.from(room.localParticipant.audioTracks.values())[0].track;

  // Store the screen LocalVideoTrack
  let localScreenTrack = null;

  // Make the Room available in the JavaScript console for debugging.
  window.room = room;

  // Handle the LocalParticipant's media.
  participantConnected(room.localParticipant, room);
  connectClientWithUsername(room.localParticipant.identity, token);
  // Subscribe to the media published by RemoteParticipants already in the Room.
  room.participants.forEach(participant => {
    participantConnected(participant, room);
  });

  // Subscribe to the media published by RemoteParticipants joining the Room later.
  room.on('participantConnected', participant => {
    participantConnected(participant, room);
  });

  // Handle a disconnected RemoteParticipant.
  room.on('participantDisconnected', participant => {
    participantDisconnected(participant, room);
  });

  // Set the current active Participant.
  setCurrentActiveParticipant(room);

  // Update the active Participant when changed, only if the user has not
  // pinned any particular Participant as the active Participant.
  room.on('dominantSpeakerChanged', () => {
    if (!isActiveParticipantPinned) {
      setCurrentActiveParticipant(room);
    }
  });

  room.on('disconnected', () => {
    updateControls();
  });
  
  room.on('connected', () => {
    updateControls();
  });
  
  room.on('reconnected', () => {
    updateControls();
  });

  room.on('reconnecting', () => {
    updateControls();
  });


  // update the video controls
  function updateControls() {
    if (room.state === 'connected') {
      $('#control-row').removeClass('d-none');
    }
    else {
      $('#control-row').addClass('d-none');
    }
    updateAudioControl();
    updateVideoControl();
    updateScreenShareControl();
    updateLeaveControl();
  }

  function updateAudioControl() {
    if (room.state !== 'disconnected' && localAudioTrack) {
      $audioshare.removeClass('btn-disabled');
      if (localAudioTrack.isEnabled) {
        $audioshare
          //.removeClass('btn-secondary').addClass('btn-light')
          .find("i").removeClass("fa-microphone-slash text-danger").addClass("fa-microphone text-white");
      }
      else {
        $audioshare
          //.removeClass('btn-light').addClass('btn-secondary')
          .find("i").removeClass("fa-microphone text-white").addClass("fa-microphone-slash text-danger");
      }
    }
    else {
      $audioshare
        .addClass('btn-disabled')//.removeClass('btn-light').addClass('btn-secondary')
        .find('i').removeClass('fa-microphone text-white').addClass('fa-microphone-slash text-danger');
    }
  }

  function updateVideoControl() {
    if (room.state !== 'disconnected' && localVideoTrack) {
      $videoshare.removeClass('btn-disabled');
      if (localVideoTrack.isEnabled) {
        $videoshare
          //.removeClass('btn-secondary').addClass('btn-light')
          .find('i').removeClass("fa-video-slash text-danger").addClass("fa-video text-white");
      }
      else {
        $videoshare
          //.removeClass('btn-light').addClass('btn-secondary')
          .find('i').removeClass("fa-video text-white").addClass("fa-video-slash text-danger");
      }
    }
    else {
      $videoshare
        //.addClass('btn-disabled').removeClass('btn-light').addClass('btn-secondary')
        .find('i').removeClass('fa-video text-white').addClass('fa-video-slash text-danger');
    }
  }

  function updateScreenShareControl() {
    if (room.state !== 'disconnected') {
      $screenshare.removeClass('btn-disabled');
      if (localScreenTrack && localScreenTrack.isEnabled) {
        console.log('Button showing share screen!');
        $screenshare
          //.removeClass('btn-secondary').addClass('btn-light')
          .find('i')
            .removeClass('text-white').addClass('text-success');
      }
      else {
        $screenshare
          //.removeClass('btn-light').addClass('btn-secondary')
          .find('i').removeClass('text-success').addClass('text-white');
      }
    }
    else {
      $screenshare
        //.removeClass('btn-light').addClass('btn-secondary')
        .addClass('btn-disabled')
        .find('i').removeClass('text-success').addClass('text-white');
    }
  }

  function updateLeaveControl() {
    if (room.state !== 'disconnected') {
      $leave.removeClass('btn-disabled');
    }
    else {
      $leave.addClass('btn-disabled');
    }
  }

  updateControls();


  // Leave the Room when the "Leave Room" button is clicked.
  $leave.click(function onLeave() {

    //$leave.off('click', onLeave);
    //room.disconnect();
    $leaveroomconfirm.modal('show');

  });

  $btnConfirmRemoveUpload.click(function onLeave() {

        
    $leave.off('click', onLeave);
    disconnectClient();
    room.disconnect();
    window.location.href = "https://app.iconnections.io/Home/Dashboard";


  });


 
  $chatroom.click(function () {
    document.getElementById("myForm").style.display = "block";
    document.getElementById("chat-input").focus();
    msgCont = 0;
    chatOpen = true;
    $('#msg-notification').text('');
    $('#msg-notification').hide();
  });

  
  $discon.click(function () {
    document.getElementById("myForm").style.display = "none";
    msgCont = 0;
    chatOpen = false;
    $('#msg-notification').text('');
    $('#msg-notification').hide();
  });
  // mute / unmute the local audio device
  $audioshare.click(() => {
    if (localAudioTrack.isEnabled) {
      localAudioTrack.disable();
    }
    else {
      localAudioTrack.enable();
    }
    updateAudioControl();
  });
 
  // enable / disable the local video device
  $videoshare.click(function () {
    if (localVideoTrack.isEnabled) {
      localVideoTrack.disable();
    }
    else {
      localVideoTrack.enable();
    }
    updateVideoControl();
  });

  // Share screen button clicked
  
  $screenshare.click(function onScreenShare() {
    if (localScreenTrack == null) {
      navigator.mediaDevices.getDisplayMedia().then((stream) => {
        let track = new LocalVideoTrack(stream.getTracks()[0]);
        let currentPublications = Array.from(room.localParticipant.videoTracks.values());
        for (let publication of currentPublications) {
          publication.unpublish();
        }
        room.localParticipant.publishTrack(track)
          .then((localTrackPublication) => {
            // subsribe to when screen sharing stops
            track.on('stopped', () => {
              setCurrentActiveParticipant(room);
              localTrackPublication.unpublish();
              room.localParticipant.publishTrack(localVideoTrack);
              localScreenTrack = null;
              updateControls();
            });

            localScreenTrack = track;
          }).catch(r => {
            console.error(r);
            track.stop();
            localScreenTrack = null;
          }).finally(() => {
            updateControls();
          });
      }).catch(r => {
        console.error(r);
        track.stop();
        localScreenTrack = null;
       }).finally(() => {
        updateControls();
      });
    }
    else {
      localScreenTrack.stop();
      // console.log("******************************************");
      // console.log(Array.from(lp.videoTracks.values()));
      // console.log('__________________________________________');
      // lp.publishTrack(Array.from(lp.videoTracks.values())[0].track);
      // lp.publishTrack(Array.from(lp.videoTracks.values())[0]); // todo fix
    }
  });  

  return new Promise((resolve, reject) => {
    // Leave the Room when the "beforeunload" event is fired.
    window.onbeforeunload = () => {
      room.disconnect();
    };

    if (isMobile) {
      // TODO(mmalavalli): investigate why "pagehide" is not working in iOS Safari.
      // In iOS Safari, "beforeunload" is not fired, so use "pagehide" instead.
      window.onpagehide = () => {
        room.disconnect();
      };

      // On mobile browsers, use "visibilitychange" event to determine when
      // the app is backgrounded or foregrounded.
      document.onvisibilitychange = async () => {
        if (document.visibilityState === 'hidden') {
          // When the app is backgrounded, your app can no longer capture
          // video frames. So, stop and unpublish the LocalVideoTrack.
          localVideoTrack.stop();
          room.localParticipant.unpublishTrack(localVideoTrack);
        } else {
          // When the app is foregrounded, your app can now continue to
          // capture video frames. So, publish a new LocalVideoTrack.
          localVideoTrack = await createLocalVideoTrack(connectOptions.video);
          await room.localParticipant.publishTrack(localVideoTrack);
        }
      };
    }

    room.once('disconnected', (room, error) => {
      // Clear the event handlers on document and window..
      window.onbeforeunload = null;
      if (isMobile) {
        window.onpagehide = null;
        document.onvisibilitychange = null;
      }
disconnectClient();
      // Stop the LocalVideoTrack.
      localVideoTrack.stop();

      // Stop the LocalScreenTrack
      if (localScreenTrack)
        localScreenTrack.stop();

      // Handle the disconnected LocalParticipant.
      participantDisconnected(room.localParticipant, room);

      // Handle the disconnected RemoteParticipants.
      room.participants.forEach(participant => {
        participantDisconnected(participant, room);
      });

      // Clear the active Participant's video.
      try
      {
        $activeVideo.get(0).srcObject = null;
      }
      catch (ex)
      {
        console.error(ex);
      }
      
      // Clear the fullscreened track
      fullscreen_sid = null;

      // Clear the Room reference used for debugging from the JavaScript console.
      window.room = null;

      if (error) {
        // Reject the Promise with the TwilioError so that the Room selection
        // modal (plus the TwilioError message) can be displayed.
        reject(error);
      } else {
        // Resolve the Promise so that the Room selection modal can be
        // displayed.
        resolve();
      }
    });
  });
}
tc.init = function() {
  $messageList = $('#messages');
  $inputText = $('#chat-input');
  $statusRow = $('#status-row');
  $typingRow = $('#typing-row');
  $typingPlaceholder = $('#typing-placeholder');
  $inputText.on('keypress', handleInputTextKeypress);
  $channelList = $('#channel-list');
  $usernameInput = $('#username-input');
  $connectPanel = $('#connect-panel');
  $newChannelInputRow = $('#new-channel-input-row');
  $newChannelInput = $('#new-channel-input');
  $usernameInput.focus();
  $typingRow.hide();
  $usernameInput.on('keypress', handleUsernameInputKeypress);
  $inputText.on('keypress', handleInputTextKeypress);
  $newChannelInput.on('keypress', tc.handleNewChannelInputKeypress);
  $('#connect-image').on('click', connectClientWithUsername);
  $('#add-channel-image').on('click', showAddChannelInput);
  $('#leave-span').on('click', disconnectClient);
  $('#delete-channel-span').on('click', deleteCurrentChannel);
};

function handleUsernameInputKeypress(event) {
  if (event.keyCode === 13){
    
  }
}

function handleInputTextKeypress(event) {
  if (!tc.generalChannel || $(this).val() === null || $(this).val() === '' || $(this).val() === undefined) {
    return;
  }
  if (event.keyCode === 13) {
    debugger;
    //printMessage($(this).val());
    tc.generalChannel.sendMessage($(this).val());
    event.preventDefault();
    $(this).val('');
  }
  else {
    notifyTyping();
  }
}

var notifyTyping = $.throttle(function() {
  if (!tc.generalChannel) {
    return;
  }
  tc.generalChannel.typing();
}, 1000);

tc.handleNewChannelInputKeypress = function(event) {
  if (event.keyCode === 13) {
    tc.messagingClient
      .createChannel({
        friendlyName: $newChannelInput.val(),
      })
      .then(hideAddChannelInput);

    $(this).val('');
    event.preventDefault();
  }
};

function connectClientWithUsername(usernameText,token) {

  if (usernameText == '') {
    alert('Username cannot be empty');
    return;
  }
  tc.username = usernameText;
  fetchAccessToken(token, connectMessagingClient);
}

function fetchAccessToken(token, handler) {
   debugger;
   handler(token);
}

function connectMessagingClient(token) {
  // Initialize the Chat messaging client
  try{
  Twilio.Chat.Client.create(token).then(function(client) {
    tc.messagingClient = client;
    debugger;
   // updateConnectedUI();
    //tc.loadChannelList(tc.joinGeneralChannel);
    tc.joinGeneralChannel();
    // tc.messagingClient.on('channelAdded', $.throttle(tc.loadChannelList));
    // tc.messagingClient.on('channelRemoved', $.throttle(tc.loadChannelList));
    tc.messagingClient.on('tokenExpired', refreshToken);
  }).catch((error) => {
    debugger;
    console.error("Chat Connection error = "+JSON.stringify(error));
  });
}catch(ex){
  debugger;
  console.error("Chat Connection error = "+ ex)}
}

function refreshToken() {
  fetchAccessToken(tc.username, setNewToken);
}

function setNewToken(token) {
  tc.messagingClient.updateToken(token);
}

function updateConnectedUI() {
  $('#username-span').text(tc.username);
  $statusRow.addClass('connected').removeClass('disconnected');
  $messageList.addClass('connected').removeClass('disconnected');
  $connectPanel.addClass('connected').removeClass('disconnected');
 // $inputText.addClass('with-shadow');
  $typingRow.addClass('connected').removeClass('disconnected');
}

 tc.loadChannelList = function(handler) {
  if (tc.messagingClient === undefined) {
    console.log('Client is not initialized');
    return;
  }

  tc.messagingClient.getPublicChannelDescriptors().then(function(channels) {
    debugger;
    if (channels === undefined) {
      console.log('channels is not initialized');
      return;
    }
   // tc.channelArray = tc.sortChannelsByName(channels.items);
    //$channelList.text('');
    //tc.channelArray.forEach(addChannel);
    if (typeof handler === 'function') {
      handler();
    }
  });
 }

tc.joinGeneralChannel = function() {
  console.log('Attempting to join "general" chat channel...');
  tc.messagingClient.getChannelByUniqueName(GENERAL_CHANNEL_UNIQUE_NAME)
  .then(function(channel) {
    tc.generalChannel = channel;
    initChannelEvents();
    setupChannel();
  }).catch(function() {
    // If it doesn't exist, let's create it
    console.log('Creating general channel');
    tc.messagingClient.createChannel({
      uniqueName: GENERAL_CHANNEL_UNIQUE_NAME,
      friendlyName: GENERAL_CHANNEL_NAME
    }).then(function(channel) {
      console.log('Created general channel:');
      tc.generalChannel = channel;
      initChannelEvents();
      setupChannel();
    }).catch(function(channel) {
      console.log('Channel could not be created:');
      console.log(channel);
    });
  });
};

function initChannel(channel) {
  console.log('Initialized channel ' + channel.friendlyName);
  return tc.messagingClient.getChannelBySid(channel.sid);
}


function initChannelEvents() {
 debugger
  console.log(tc.generalChannel.friendlyName + ' ready.');
  tc.generalChannel.on('messageAdded', tc.addMessageToList);
  tc.generalChannel.on('typingStarted', tc.showTypingStarted);
  tc.generalChannel.on('typingEnded', tc.hideTypingStarted);
  tc.generalChannel.on('memberJoined', notifyMemberJoined);
  tc.generalChannel.on('memberLeft', notifyMemberLeft);
  $inputText.prop('disabled', false).focus();
  
}

// Set up channel after it has been found
function setupChannel() {
  // Join the general channel
  tc.generalChannel.join().then(function(channel) {
    tc.loadMessages();
    
  }).catch(function(err) {
    if (tc.generalChannel.status == 'joined') {
     // initChannelEvents();
      tc.loadMessages();
      
    } 
    console.error(
      "Couldn't join channel " + tc.generalChannel.friendlyName + ' because -> ' + err
    );
  });
}
tc.loadMessages = function() {
  if(tc.generalChannel){
  tc.generalChannel.getMessages(MESSAGES_HISTORY_LIMIT).then(function (messages) {
    messages.items.forEach(tc.addMessageToList);
    showNotification = true;
  });
 

}
};

function leaveCurrentChannel() {
  if (tc.generalChannel) {
    return tc.generalChannel.leave().then(function(leftChannel) {
      console.log('left ' + leftChannel.friendlyName);
      leftChannel.removeListener('messageAdded', tc.addMessageToList);
      leftChannel.removeListener('typingStarted', tc.showTypingStarted);
      leftChannel.removeListener('typingEnded', tc.hideTypingStarted);
      leftChannel.removeListener('memberJoined', notifyMemberJoined);
      leftChannel.removeListener('memberLeft', notifyMemberLeft);
    });
  } else {
    return Promise.resolve();
  }
}
tc.getTodayDate = function(date) {
  var today = moment();
  var inputDate = moment(date);
  var outputDate;

  if (today.format('YYYYMMDD') == inputDate.format('YYYYMMDD')) {
    outputDate = 'Today - ';
  }
  else {
    outputDate = inputDate.format('MMM. D - ');
  }
  //outputDate = outputDate + inputDate.format('hh:mma');
  outputDate = inputDate.format('hh:mma');
  return outputDate;
  
}
tc.addMessageToList = function(message) {
  debugger;
  var rowDiv = "";
   if (message.author === tc.username) {
      rowDiv = '<li style="width:100%;">' +
      '<div class="msj-rta macro">' +
          '<div class="text text-r">' +
              '<p>'+message.body+'</p>' +
              '<p><small>'+message.author +':'+tc.getTodayDate(message.timestamp)+'</small></p>' +
          '</div>' +
     // '<div class="avatar" style="padding:0px 0px 0px 10px !important"><img class="img-circle" style="width:100%;" src="'+you.avatar+'" /></div>' +                                
    '</li>';
    
  }
  else{
    rowDiv = '<li style="width:100%">' +
    '<div class="msj macro">' +
        '<div class="text text-l">' +
            '<p>'+ message.body +'</p>' +
            '<p><small>'+message.author +':'+tc.getTodayDate(message.timestamp)+'</small></p>' +
        '</div>' +
    '</div>' +
  '</li>';
  }
  $messageList.append(rowDiv);
  scrollToMessageListBottom();
  if(showNotification && message.author !== tc.username && !chatOpen){
    msgCont ++;
    $('#msg-notification').show();
    $('#msg-notification').text(msgCont);
  }else{
    msgCont = 0;
    $('#msg-notification').text('');
    $('#msg-notification').hide();
  }
};
function printMessage(msg){
  var rowDiv = '<li style="width:100%;">' +
      '<div class="msj-rta macro">' +
          '<div class="text text-r">' +
              '<p>'+msg+'</p>' +
              '<p><small>'+tc.username +':'+moment().format('hh:mma')+'</small></p>' +
          '</div>' +
     // '<div class="avatar" style="padding:0px 0px 0px 10px !important"><img class="img-circle" style="width:100%;" src="'+you.avatar+'" /></div>' +                                
    '</li>';
    $messageList.append(rowDiv);
    scrollToMessageListBottom();
}
function notifyMemberJoined(member) {
  notify(member.identity + ' joined')
}

function notifyMemberLeft(member) {
  notify(member.identity + ' left');
}

function notify(message) {
  var row = $('<div>').addClass('col-md-12');
  row.loadTemplate($('.member-notification-template'), {
    status: message
  });
  $messageList.append(row);
  scrollToMessageListBottom();
}

tc.showTypingStarted = function(member) {
  debugger;
  $typingRow.show();
  $typingPlaceholder.text(member.identity + ' is typing...');
}

tc.hideTypingStarted = function(member) {
  
  $typingPlaceholder.text('');
  $typingRow.hide();
}

function scrollToMessageListBottom() {
  $messageList.scrollTop($messageList[0].scrollHeight);
}


function showAddChannelInput() {
  if (tc.messagingClient) {
    $newChannelInputRow.addClass('showing').removeClass('not-showing');
    $channelList.addClass('showing').removeClass('not-showing');
    $newChannelInput.focus();
  }
}

function hideAddChannelInput() {
  $newChannelInputRow.addClass('not-showing').removeClass('showing');
  $channelList.addClass('not-showing').removeClass('showing');
  $newChannelInput.val('');
}

function addChannel(channel) {
  if (channel.uniqueName === GENERAL_CHANNEL_UNIQUE_NAME) {
    tc.generalChannel = channel;
  }
  var rowDiv = $('<div>').addClass('row channel-row');
  rowDiv.loadTemplate('#channel-template', {
    channelName: channel.friendlyName
  });

  var channelP = rowDiv.children().children().first();

  rowDiv.on('click', selectChannel);
  channelP.data('sid', channel.sid);
  if (tc.generalChannel && channel.sid === tc.generalChannel.sid) {
    tc.currentChannelContainer = channelP;
    channelP.addClass('selected-channel');
  }
  else {
    channelP.addClass('unselected-channel')
  }

  $channelList.append(rowDiv);
}

function deleteCurrentChannel() {
  if (!tc.generalChannel) {
    return;
  }

  // if (tc.generalChannel.sid === tc.generalChannel.sid) {
  //   alert('You cannot delete the general channel');
  //   return;
  // }

  tc.generalChannel
    .delete()
    .then(function(channel) {
      console.log('channel: '+ channel.friendlyName + ' deleted');
      //setupChannel(tc.generalChannel);
    });
}

function selectChannel(event) {
  var target = $(event.target);
  var channelSid = target.data().sid;
  var selectedChannel = tc.channelArray.filter(function(channel) {
    return channel.sid === channelSid;
  })[0];
  if (selectedChannel === tc.generalChannel) {
    return;
  }
  setupChannel();
};

function disconnectClient() {
  leaveCurrentChannel();
  //deleteCurrentChannel();
  tc.generalChannel.status == 'left';
  $channelList.text('');
  $messageList.text('');
  $statusRow.addClass('disconnected').removeClass('connected');
  $messageList.addClass('disconnected').removeClass('connected');
  $connectPanel.addClass('disconnected').removeClass('connected');
  $inputText.removeClass('with-shadow');
  $typingRow.addClass('disconnected').removeClass('connected');
}

tc.sortChannelsByName = function(channels) {
  if (channels === undefined) {
    console.log('channels is not initialized');
    return;
  }
  return channels.sort(function(a, b) {
    if (a.friendlyName === GENERAL_CHANNEL_NAME) {
      return -1;
    }
    if (b.friendlyName === GENERAL_CHANNEL_NAME) {
      return 1;
    }
    return a.friendlyName.localeCompare(b.friendlyName);
  });
};

module.exports = joinRoom;
