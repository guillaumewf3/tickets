var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uniqid = require('uniqid');
var dateFormat = require('dateformat');

var publicRoot = __dirname + '/public';

//stocke la socket du prof pour envoyer un message spécifique
var teacherSocket;

//requête sur / => envoi du public/index.html
app.get('/', function(req, res){
	res.sendFile('index.html', { root: publicRoot });
});

//pour les assets
app.use(express.static(publicRoot));

//stocke les questions en mode simple, pour tester les droits
var privateReqs = [];

//toutes les questions en cours
var reqs = {
	"urgent": [],
	"asap": [],
	"lazy": []
};

//connection
io.on('connection', function(socket){

	//écoute le message "getRequests"
	socket.on('getRequests', function(){
		console.log('getRequests');
		io.emit('help', reqs); //envoie un message "help" au client, avec toutes les questions en cours
	});

	//écoute le message "login"
	socket.on('login', function(username){
		console.log('login');
		var user = {
			'id': (username == "guillaume") ? "boumboum" : uniqid(), //token
			'username': username
		};

		//prof ici
		if (username == "guillaume"){
			teacherSocket = socket;
		}

		//envoie un message seulement à l'utilisateur qui vient de se connecter
		io.to(socket.id).emit('userToken', user);
	});

	//nouvelle question
	socket.on('help', function(data){
		console.log('help');

		//crée l'objet
		var req = {
			"id": uniqid(),
			"username": data.user.username,
			"level": data.level,
			"date": dateFormat(new Date(), "dd/mm à HH:MM:ss")
		};

		//ajout dans le tableau général
		reqs[req.level].push(req);

		//ajout dans le tableau simple
		var privateReq = {
			reqId: req.id,
			authorId: data.user.id
		};
		privateReqs.push(privateReq);

		//envoie les questions à tout le monde
		io.emit('help', reqs);

		//pour prévenir le prof de l'arrivée d'une nouvelle question
		if (teacherSocket){
			io.to(teacherSocket.id).emit('newRequest', req);
		}
	});

	//retire une question
	socket.on('removeRequest', function(data){

		console.log('removeRequest');
		
		var reqId = data.reqId;
		var user = data.user;

		//cherche la question dans le tableau simple
		for(var i=0; i<privateReqs.length; i++){
			if (privateReqs[i]['reqId'] == reqId){
				//teste si c'est bien l'auteur qui tente de la retirer... ou le prof
				if (privateReqs[i]['authorId'] == user.id || user.id == "boumboum"){
					//ok pour l'enlever
					//retire du tableau simple
					privateReqs.splice(i, 1);

					//retire du tableau complet des questions
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

		//envoie le nouveau tableau de questions
		io.emit('help', reqs);
	});

	//déconnexion
	socket.on('disconnect', function(){
		console.log('disconnect');
	});
});

//go
http.listen(8080, function(){
	console.log('listening on *:8080');
});