var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uniqid = require('uniqid');
var dateFormat = require('dateformat');

var teacherSocket;

//send base file to client
app.get('/', function(req, res){
	res.sendFile('index.html', { root: __dirname });
});

app.use(express.static(__dirname + '/public'));

//private requests
var privateReqs = [];

//current requests
var reqs = {
	"urgent": [],
	"asap": [],
	"lazy": []
};

//connection
io.on('connection', function(socket){
	//send current requests on connect
	io.emit('help', reqs);

	//login event
	socket.on('login', function(username){
		var user = {
			'id': (username == "guillaume") ? "boumboum" : uniqid(),
			'username': username
		};

		if (username == "guillaume"){
			teacherSocket = socket;
		}

		io.to(socket.id).emit('userToken', user);
	});

	//help event
	socket.on('help', function(data){
		var req = {
			"id": uniqid(),
			"username": data.user.username,
			"level": data.level,
			"date": dateFormat(new Date(), "dd/mm à HH:MM:ss")
		};
		reqs[req.level].push(req);

		var privateReq = {
			reqId: req.id,
			authorId: data.user.id
		};
		privateReqs.push(privateReq);

		io.emit('help', reqs);

		if (teacherSocket){
			io.to(teacherSocket.id).emit('newRequest', req);
		}
	});

	//remove request event
	socket.on('removeRequest', function(data){
		var reqId = data.reqId;
		var user = data.user;

		for(var i=0; i<privateReqs.length; i++){
			if (privateReqs[i]['reqId'] == reqId){
				if (privateReqs[i]['authorId'] == user.id || user.id == "boumboum"){
					//ok to remove
					privateReqs.splice(i, 1);
					for(l in reqs){
						if (reqs[l].length > 0){
							for(var k=0;k<reqs[l].length;k++){
								if (reqs[l][k]['id'] == reqId){
									reqs[l].splice(k, 1);
								}
							}
						}
					}
				}
				break;
			}
		}

		io.emit('help', reqs);
	});

	//disconnection
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});
});

//go
http.listen(8080, function(){
	console.log('listening on *:8080');
});