/* jshint quotmark: false, unused: vars, browser: true */
/* global cordova, console, $, bluetoothSerial, _, refreshButton, deviceList, previewColor, red, green, blue, disconnectButton, connectionScreen, colorScreen, rgbText, messageDiv */
'use strict';

var prox = false;
var fenceX = 43.470151;
var fenceY = -79.701940; //hardcoded
var stop = false;
var pos = {
    lat: 0,
    lng: 0
};

/***************************************************

Gotta load up saved locations from server beforehand

***************************************************/
// $( "#saveLocation" ).hide();

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(showPosition); //position changes
}

function showPosition(position) {
    if (Math.sqrt(Math.pow(fenceX - position.coords.latitude, 2) + Math.pow(fenceY - position.coords.longitude, 2)) <= 0.001) {
        prox = true;
        // bluetoothSerial.write("a");
    } else {
        prox = false;
        // bluetoothSerial.write("b");
    }

    pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };
    //current location

    //    if(stop == false){
    //        initMap(position.coords.latitude, position.coords.longitude);
    //    }
}

function initMap(latitude, longitude) {
    var myLatlng = {
        lat: latitude,
        lng: longitude
    };

    var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: myLatlng,
        disableDefaultUI: true
    });

    map.addListener('click', function(event) {
        var clickPos = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
        }

        var marker = new google.maps.Marker({
            position: clickPos,
            map: map
        });

        // $( "#saveLocation" ).show();

        /********************************
        CODE THAT ADDS LOCATION TO SERVER
        clickPos.lat and clickPos.lng
        ********************************/

        marker.addListener('click', function(event) {
            /*************************************
            CODE THAT REMOVES LOCATION FROM SERVER
            marker.getPosition().lat() and marker.getPosition().lng()
            Removing a location the marker coords instead because click may not be exact
            *************************************/
            marker.setMap(null);
        });
    });
}

var app = {
    initialize: function() {
        this.bind();
    },
    bind: function() {
        document.addEventListener('deviceready', this.deviceready, false);
        colorScreen.hidden = true;
    },
    deviceready: function() {
        deviceList.ontouchstart = app.connect;
        refreshButton.ontouchstart = app.list;
        disconnectButton.ontouchstart = app.disconnect;

        var throttledOnColorChange = _.throttle(app.onColorChange, 200);
        $('input').on('change', throttledOnColorChange);

        app.list();
    },
    list: function(event) {
        deviceList.firstChild.innerHTML = "Discovering...";
        app.setStatus("Looking for Bluetooth Devices...");

        bluetoothSerial.list(app.ondevicelist, app.generateFailureFunction("List Failed"));
    },
    connect: function(e) {
        app.setStatus("Connecting...");
        var device = e.target.getAttribute('deviceId');
        console.log("Requesting connection to " + device);
        bluetoothSerial.connect(device, app.onconnect, app.ondisconnect);
    },
    disconnect: function(event) {
        if (event) {
            event.preventDefault();
        }

        app.setStatus("Disconnecting...");
        bluetoothSerial.disconnect(app.ondisconnect);
    },
    onconnect: function() {
        connectionScreen.hidden = true;
        colorScreen.hidden = false;
        app.setStatus("Connected.");

        function loadMap() {
            if (!(pos.lat == 0 && pos.lng == 0)) {
                initMap(pos.lat, pos.lng);
            } else {
                setTimeout(function() {
                    loadMap();
                }, 1000);
            }
        }
        loadMap();
        
        saveLocation.hidden= true;
    },
    ondisconnect: function() {
        connectionScreen.hidden = false;
        colorScreen.hidden = true;
        app.setStatus("Disconnected.");
    },
    onColorChange: function(evt) {
        var c = app.getColor();
        rgbText.innerText = c;
        previewColor.style.backgroundColor = "rgb(" + c + ")";
        app.sendToArduino(c);
    },
    getColor: function() {
        var color = [];
        color.push(red.value);
        color.push(green.value);
        color.push(blue.value);
        return color.join(',');
    },
    sendToArduino: function(c) {
        bluetoothSerial.write("c" + c + "\n");
    },
    timeoutId: 0,
    setStatus: function(status) {
        if (app.timeoutId) {
            clearTimeout(app.timeoutId);
        }
        messageDiv.innerText = status;
        app.timeoutId = setTimeout(function() {
            messageDiv.innerText = "";
        }, 4000);
    },
    ondevicelist: function(devices) {
        var listItem, deviceId;

        // remove existing devices
        deviceList.innerHTML = "";
        app.setStatus("");

        devices.forEach(function(device) {
            listItem = document.createElement('li');
            listItem.className = "topcoat-list__item";
            if (device.hasOwnProperty("uuid")) { // TODO https://github.com/don/BluetoothSerial/issues/5
                deviceId = device.uuid;
            } else if (device.hasOwnProperty("address")) {
                deviceId = device.address;
            } else {
                deviceId = "ERROR " + JSON.stringify(device);
            }
            listItem.setAttribute('deviceId', device.address);
            listItem.innerHTML = device.name + "<br/><i>" + deviceId + "</i>";
            deviceList.appendChild(listItem);
        });

        if (devices.length === 0) {

            if (cordova.platformId === "ios") { // BLE
                app.setStatus("No Bluetooth Peripherals Discovered.");
            } else { // Android
                app.setStatus("Please Pair a Bluetooth Device.");
            }

        } else {
            app.setStatus("Found " + devices.length + " device" + (devices.length === 1 ? "." : "s."));
        }
    },
    generateFailureFunction: function(message) {
        var func = function(reason) {
            var details = "";
            if (reason) {
                details += ": " + JSON.stringify(reason);
            }
            app.setStatus(message + details);
        };
        return func;
    }
};