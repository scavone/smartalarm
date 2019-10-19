var express = require('express');
var app = express();
var nap = require('nodealarmproxy');
var bodyParser = require('body-parser');

if (process.env.NODE_ALARM_ACCESS_TOKEN && process.env.NODE_ALARM_APP_ID) {
	//SmartThings is setup/enabled
	var https = require('https');
}

var alarm = nap.initConfig({ password:process.env.NODE_ALARM_PASSWORD,
	serverpassword:process.env.NODE_ALARM_SERVER_PASSWORD,
	actualhost:process.env.NODE_ALARM_PROXY_HOST,
	actualport:process.env.NODE_ALARM_PROXY_PORT,
	serverhost:'0.0.0.0',
	serverport:process.env.NODE_ALARM_SERVER_PORT,
	zone:'7',
	partition:1,
	proxyenable:true,
	atomicEvents:true
});

var watchevents = ['601','602','609','610','650','651','652','653','654','655','656','657','658','659'];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

app.get('/', function(req, res){
	res.send('hello world!');
});

app.get('/status', function(req, res){
	sendStatus(function(){
		res.send('sending status');
	});
});

app.post('/jsoncommand', function(req,res){
	var reqObj = req.body.content;
	var STpass = process.env.NODE_ALARM_STPASS;
	var alarm_pin = process.env.NODE_ALARM_PIN;
	if (reqObj.password == STpass) {
		if (reqObj.command =='arm') {
			nap.manualCommand('0331'+alarm_pin,function(){
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
			nap.manualCommand('0711*9'+alarm_pin,function(){
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

alarm.on('data', function(data) {
	console.log('npmtest data:',data);
});

alarm.on('zoneupdate', function(data) {
	console.log('npmtest zoneupdate:',data);
	if (watchevents.indexOf(data.code) != -1) {
		var jsonString = JSON.stringify(data);
		var app_id = process.env.NODE_ALARM_APP_ID;
		var access_token = process.env.NODE_ALARM_ACCESS_TOKEN;
		var smartURL = '/api/smartapps/installations/'+app_id+'/panel/zoneupdate?access_token='+access_token;
		console.log('smartURL:',smartURL);

		httpsRequest(smartURL,jsonString,function(){
			console.log('zone sent');
		});
	}
});

alarm.on('partitionupdate', function(data) {
	console.log('npmtest partitionupdate:',data);
	if (watchevents.indexOf(data.code) != -1) {
		var jsonString = JSON.stringify(data);
		var app_id = process.env.NODE_ALARM_APP_ID;
		var access_token = process.env.NODE_ALARM_ACCESS_TOKEN;
		var smartURL = '/api/smartapps/installations/'+app_id+'/panel/partitionupdate?access_token='+access_token;
		console.log('smartURL:',smartURL);

		httpsRequest(smartURL,jsonString,function(){
			console.log('partition sent');
		});
	}
});

/* alarm.on('zoneupdate', function(data) {
	console.log('npmtest zoneupdate:',data);
	if (watchevents.indexOf(data.code) != -1) {
		var smartURL = "https://graph.api.smartthings.com/api/smartapps/installations/"+process.env.NODE_ALARM_APP_ID+"/panel/"+data.code+"/zone"+data.zone+"?access_token="+process.env.NODE_ALARM_ACCESS_TOKEN;
		console.log('smartURL:',smartURL);
		https.get(smartURL, function(res) {
			console.log("Got response: " + res.statusCode);
		}).on('error', function(e) {
			console.log("Got error: " + e.message);
		});
	}
});

alarm.on('partitionupdate', function(data) {
	console.log('npmtest partitionupdate:',data);
	if (watchevents.indexOf(data.code) != -1) {	
		var smartURL = "https://graph.api.smartthings.com/api/smartapps/installations/"+process.env.NODE_ALARM_APP_ID+"/panel/"+data.code+"/partition"+data.partition+"?access_token="+process.env.NODE_ALARM_ACCESS_TOKEN;
		console.log('smartURL:',smartURL);
		https.get(smartURL, function(res) {
			console.log("Got response: " + res.statusCode);
		}).on('error', function(e) {
			console.log("Got error: " + e.message);
		});
	}
}); */

function sendStatus (callback) {
	nap.getCurrent(function(currentstate){
		console.log('sendStatus:',currentstate);
  		var jsonString = JSON.stringify(currentstate);
		var smartURL = '/api/smartapps/installations/'+process.env.NODE_ALARM_APP_ID+'/panel/fullupdate?access_token='+process.env.NODE_ALARM_ACCESS_TOKEN;
		console.log('smartURL:',smartURL);

		httpsRequest(smartURL,jsonString, function(){
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
		console.log("Got response: " + res.statusCode);
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

app.listen(Number(8086),'0.0.0.0');