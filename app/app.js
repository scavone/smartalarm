var express = require('express');
var app = express();
var nap = require('nodealarmproxy');
var config = require('./config.js');
var https = require('https');
var bodyParser = require('body-parser');

var alarm = nap.initConfig({ password:process.env.NODE_ALARM_PASSWORD || config.password,
	serverpassword:process.env.NODE_ALARM_SERVER_PASSWORD || config.serverpassword,
	actualhost:process.env.NODE_ALARM_PROXY_HOST || config.host,
	actualport:process.env.NODE_ALARM_PROXY_PORT || config.port,
	serverhost:'0.0.0.0',
	serverport:process.env.NODE_ALARM_SERVER_PORT || config.port,
	zone:8,
	partition:1,
	proxyenable:true
});

app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({
//  extended: true
//}));

app.get('/', function(req, res){
	console.log('req');
  res.send('hello world');
});

app.get('/status', function(req, res){
	sendStatus(function(){
		res.send('sending status');
	});
});

app.post('/jsoncommand', function(req,res){
	var reqObj = req.body.content;
	// console.log('reqObj',reqObj);
	var STpass = process.env.NODE_ALARM_STPASS || config.STpass;
	var alarm_pin = process.env.NODE_ALARM_PIN || config.alarm_pin;
	if (reqObj.password == STpass) {
		if (reqObj.command =='arm') {
			nap.manualCommand('0301',function(){
	  		console.log('armed armed armed armed');
	  		res.send('arming');
	  	});
		}
		if (reqObj.command == 'disarm') {
			nap.manualCommand('0401'+alarm_pin,function(){
		  		res.send('disarmed');
		  	});
		}
		if (reqObj.command == 'stayarm') {
			nap.manualCommand('0311',function(){
				res.send('stayarm');
		  	});
		}
		if (reqObj.command == 'nightarm') {
			nap.manualCommand('0711*7'+alarm_pin,function(){
				res.send('nightarm');
		  	});
		}
		if (reqObj.command == 'status') {
			sendStatus(function(){
				res.send('sending status');
			});
		}
	}
});

alarm.on('zone', function(data) {
	if (config.watchevents.indexOf(data.code) != -1) {
		var jsonString = JSON.stringify(data);
		var app_id = process.env.NODE_ALARM_APP_ID || config.app_id;
		var access_token = process.env.NODE_ALARM_ACCESS_TOKEN || config.access_token;
		var pathURL = '/api/smartapps/installations/'+app_id+'/panel/zoneupdate?access_token='+access_token;

		httpsRequest(pathURL,jsonString,function(){
			console.log('zone sent');
		});
	}
});

alarm.on('partition', function(data) {
	console.log('data:',data);
	if (config.watchevents.indexOf(data.code) != -1) {
		var jsonString = JSON.stringify(data);
		var app_id = process.env.NODE_ALARM_APP_ID || config.app_id;
		var access_token = process.env.NODE_ALARM_ACCESS_TOKEN || config.access_token;
		var pathURL = '/api/smartapps/installations/'+app_id+'/panel/partitionupdate?access_token='+access_token;

		httpsRequest(pathURL,jsonString,function(){
			console.log('partition sent');
		});
	}
});

function sendStatus (callback) {
	nap.getCurrent(function(currentstate){
		
  		var jsonString = JSON.stringify(currentstate);
		var app_id = process.env.NODE_ALARM_APP_ID || config.app_id;
		var access_token = process.env.NODE_ALARM_ACCESS_TOKEN || config.access_token;
		var pathURL = '/api/smartapps/installations/'+app_id+'/panel/fullupdate?access_token='+access_token;

		httpsRequest(pathURL,jsonString, function(){
			callback();
		});
	});
}

function httpsRequest (pathURL, jsonString, callback) {
	var headers = {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(jsonString)
	};

	var options = {
		host: 'graph.api.smartthings.com',
		port: 443,
		path: pathURL,
		method: 'POST',
		headers: headers
	};

	var req = https.request(options, function(res) {
		console.log("statusCode: ", res.statusCode);
		//console.log("headers: ", res.headers);

		res.on('data', function(d) {
			console.log(d);
		});
		res.on('end', function() {
			console.log('res end');
			callback();
		});
	}).on('error', function(e) {
		console.log("Got error: " + e.message);
	});
	req.write(jsonString);
	req.end();
}

app.listen(8086,'0.0.0.0');
