var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uniqid = require('uniqid');
var dateFormat = require('dateformat');
var striptags = require('striptags');

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

	//écoute le message "logout"
	
	socket.on('logout', function(data){
		var user = data.user;
		console.log(user);
		//cherche le user dans le tableau simple des requêtes
		var i = privateReqs.length;
		while(i--){
			console.log(privateReqs[i].authorId, user.id);
			if (privateReqs[i].authorId == user.id){
				console.log(privateReqs[i]);
				removeRequestFromList(privateReqs[i].reqId);
				privateReqs.splice(i, 1);
			}
		}

		io.emit('help', reqs);
	});
	

	//écoute le message "login"
	socket.on('login', function(username){
		var username = striptags(username);
		console.log('login');
		var user = {
			'id': (username == "prof") ? "prof" : uniqid(), //token
			'username': username
		};

		//prof ici
		if (username == "prof"){
			teacherSocket = socket;
		}

		//envoie un message seulement à l'utilisateur qui vient de se connecter
		io.to(socket.id).emit('userToken', user);
	});

	//nouvelle question
	socket.on('help', function(data){
		console.log('help');

		//cherche une question de cet user dans le tableau simple pour éviter les doubles posts
		for(var i=0; i<privateReqs.length; i++){
			if (privateReqs[i]['authorId'] == data.user.id){
				console.log('double post');
				io.to(socket.id).emit('showError', "Vous avez déjà posé une question !");
				return false;
			}
		}

		var now = new Date();

		//vérifie les heures d'ouverture
		h = now.getHours();
		m = now.getMinutes();

		//crée l'objet
		var req = {
			"id": uniqid(),
			"username": striptags(data.user.username),
			"level": striptags(data.level),
			"date": dateFormat(now, "dd/mm à HH:MM:ss")
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
				if (privateReqs[i]['authorId'] == user.id || user.id == "prof"){
					//ok pour l'enlever
					//retire du tableau simple
					privateReqs.splice(i, 1);

					removeRequestFromList(reqId);
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

function removeRequestFromList(reqId){
	console.log(reqId);
	console.log(reqs);
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

//go
http.listen(3002, function(){
	console.log('listening on *:3002');
});