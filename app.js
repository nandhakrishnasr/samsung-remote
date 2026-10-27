// Samsung TV Web Remote Controller
const DEFAULT_CHANNEL = 'samsung-remote-a02512e1';
const BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';

let client = null;
let currentChannel = localStorage.getItem('tv_channel_id') || DEFAULT_CHANNEL;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupChannelInput();
  initMqtt();
  setupTouchpadGestures();
});

function setupChannelInput() {
  const channelInput = document.getElementById('channelInput');
  if (channelInput) channelInput.value = currentChannel;
}

function initMqtt() {
  updateStatus(false, 'Connecting...');

  const clientId = 'remote-ui-' + Math.random().toString(16).substring(2, 10);
  
  try {
    client = mqtt.connect(BROKER_URL, {
      clientId: clientId,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 2000
    });

    client.on('connect', () => {
      console.log('Connected to MQTT Relay Broker');
      updateStatus(true, 'Connected');
      
      // Subscribe to status ping/pong if needed
      client.subscribe(currentChannel + '/status');
    });

    client.on('error', (err) => {
      console.error('MQTT error:', err);
      updateStatus(false, 'Error');
    });

    client.on('offline', () => {
      updateStatus(false, 'Disconnected');
    });

    client.on('reconnect', () => {
      updateStatus(false, 'Reconnecting...');
    });
  } catch (e) {
    console.error('Connection failed:', e);
    updateStatus(false, 'Failed');
  }
}

function updateStatus(connected, text) {
  const badge = document.getElementById('statusBadge');
  const label = document.getElementById('statusText');
  if (badge) {
    badge.className = 'status-badge' + (connected ? ' connected' : '');
  }
  if (label) {
    label.textContent = text;
  }
}

// Send Command
function sendKey(keyName) {
  triggerHaptic();
  if (!client || !client.connected) {
    console.warn('Bridge not connected');
  }

  const payload = JSON.stringify({
    type: 'key',
    key: keyName,
    ts: Date.now()
  });

  if (client) {
    client.publish(currentChannel + '/cmd', payload, { qos: 0 });
  }
}

function launchApp(appId) {
  triggerHaptic();
  const payload = JSON.stringify({
    type: 'launch',
    appId: appId,
    ts: Date.now()
  });

  if (client) {
    client.publish(currentChannel + '/cmd', payload, { qos: 0 });
  }
}

function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(15);
  }
}

// Swipe gestures on D-Pad
function setupTouchpadGestures() {
  const dpad = document.getElementById('dpadTouchArea');
  if (!dpad) return;

  let startX = 0;
  let startY = 0;
  const threshold = 35; // minimum swipe distance

  dpad.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
  }, { passive: true });

  dpad.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 1) {
      const diffX = e.changedTouches[0].clientX - startX;
      const diffY = e.changedTouches[0].clientY - startY;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > threshold) {
          if (diffX > 0) sendKey('KEY_RIGHT');
          else sendKey('KEY_LEFT');
        }
      } else {
        if (Math.abs(diffY) > threshold) {
          if (diffY > 0) sendKey('KEY_DOWN');
          else sendKey('KEY_UP');
        }
      }
    }
  }, { passive: true });
}

// Settings Modal
function openSettings() {
  triggerHaptic();
  document.getElementById('settingsModal').classList.add('active');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('active');
}

function saveSettings() {
  const newChannel = document.getElementById('channelInput').value.trim();
  if (newChannel && newChannel !== currentChannel) {
    currentChannel = newChannel;
    localStorage.setItem('tv_channel_id', currentChannel);
    if (client) {
      client.end(true, () => {
        initMqtt();
      });
    }
  }
  closeSettings();
}
