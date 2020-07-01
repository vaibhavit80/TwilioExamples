'use strict';

var Video = require('twilio-video');

/**
 * Connect to a Room with the given bandwidth constraints.
 * @param {string} token - Token for joining the Room
 * @param {string} roomName - Room name
 * @param {?number} maxAudioBitrate - Max audio bitrate (bps)
 * @param {?number} maxVideoBitrate - Max video bitrate (bps)
 * @returns {CancelablePromise<Room>}
 */
function connectWithBandwidthConstraints(token, roomName, maxAudioBitrate, maxVideoBitrate) {
  return Video.connect(token, {
    maxAudioBitrate: maxAudioBitrate,
    maxVideoBitrate: maxVideoBitrate,
    name: roomName,
    audio: true,
    video: { height: 720, frameRate: 24, width: 1280 },
    bandwidthProfile: {
    video: {
      mode: 'grid',
      maxTracks: 10,
      renderDimensions: {
        high: {height:1080, width:1920},
        standard: {height:720, width:1280},
        low: {height:176, width:144}
      }
    }
  },
  preferredVideoCodecs: [{ codec: 'VP8', simulcast: true }],
  networkQuality: {local:1, remote: 1}
  });
}

/**
 * Update the bandwidth constraints of a Room.
 * @param {Room} room - The Room whose bandwidth constraints have to be updated
 * @param {?number} maxAudioBitrate - Max audio bitrate (bps)
 * @param {?number} maxVideoBitrate - Max video bitrate (bps)
 */
function updateBandwidthConstraints(room, maxAudioBitrate, maxVideoBitrate) {
  room.localParticipant.setParameters({
    maxAudioBitrate: maxAudioBitrate,
    maxVideoBitrate: maxVideoBitrate
  });
}

exports.connectWithBandwidthConstraints = connectWithBandwidthConstraints;
exports.updateBandwidthConstraints = updateBandwidthConstraints;
