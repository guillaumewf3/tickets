//connexion au serveur de websocket avec socket.io
var socket = io({  
	'reconnect': true,
  	'reconnection delay': 1000,
  	'max reconnection attempts': 100
});

//données de l'utilisateur connecté
var user;

//met à jour le tableau des questions
function updateRequests(data){
	
	//si l'utilisateur n'est pas encore connecté, ne pas exécuter la suite
	if (!user){
		return false;
	}

	var trClass;
	$('#requests tbody').empty();
	
	//les questions sont classés par niveau d'urgence côté serveur
	for(l in data){
	
		if (data[l].length > 0){
	
			for(var i=0;i<data[l].length;i++){
				var req = data[l][i]; //req = une question

				//pour les couleurs des tr
				switch(req.level){
					case "urgent":
						trClass = "danger"; break;
					case "asap":
						trClass = "warning"; break;
					case "lazy":
						trClass = "success"; break;
				}

				//construit l'élément
				var reqEl = $("<tr>").attr("id", req.id).addClass(trClass);
				var name = $("<td>").html(req.username);
				var date = $("<td>").html(req.date);
				var level = $("<td>").html(req.level);
				var actionTd = $("<td>");		

				//ajoute les boutons pour l'auteur de la question, ou pour guillaume
				if (req.username == user.username || user.username == "guillaume"){
					var removeButton = $('<button>').html("C'est bon !").attr({
						"data-id": req.id
					}).addClass("btn btn-xs btn-primary remove-button");
					actionTd.append(removeButton);
				}

				//ajoute au dom
				reqEl.append(name).append(date).append(level).append(actionTd);
				$('#requests tbody').append(reqEl);
			}
		}
	}
}

//appelée sur click d'un bouton de question
function onHelpButton(e){
	socket.emit('help', {
		"user": user,
		"level": $(this).attr("data-level")
	});
}

//appelée sur soumission du formulaire de connexion
function onLoginFormSubmission(e){
	e.preventDefault();
	var username = $('#name').val();
	socket.emit('login', username);
}

//appelée sur message du serveur de type "userToken"
function completeLogin(data){
	user = data;
	localStorage.setItem('username', user.username);
	$("body").addClass("connected");
	socket.emit('getRequests'); //demande au serveur de récupérer les questions en cours
}

//appelée sur clic du lien de déconnexion
function onLogout(){
	//$("body").removeClass("connected");
	socket.emit('logout', {
		"user": user,
	});
	localStorage.removeItem('user');
	localStorage.removeItem('username');
	document.location.reload(true);
}

//appelée à l'initialisation
//tente de retrouver le username dans le localStorage pour éviter le formulaire de connexion
function retrieveUserFromLocalStorage(){
	var usernameFromLS = localStorage.getItem('username');

	if (usernameFromLS){
		var username = usernameFromLS;
		socket.emit('login', username); //simule une connexion
	}
}

//demande au serveur de retirer une question
function removeRequest(){
	reqId = $(this).attr("data-id");
	socket.emit('removeRequest', {
		"reqId": reqId,
		"user": user //pour vérifier la permission
	});
}

//appelée lorsqu'une nouvelle requête vient d'être ajoutée côté serveur
//seulement le prof devrait recevoir ce message "newRequest"
function newRequest(req){
	$("#"+req.level+"-sound")[0].play();
}

function teacherIsClosed(){
	$("#oops").show();
}

function init(){
	retrieveUserFromLocalStorage();
}

new Konami(function(){window.setInterval(function(){$("audio")[Math.floor(Math.random()*3)].play();console.log("kon!");},1000)});

//écoute les messages du serveur...
socket.on('help', updateRequests);
socket.on('userToken', completeLogin);
socket.on('newRequest', newRequest);
socket.on('teacherIsClosed', teacherIsClosed);

//écoute les événements locaux
$('#loginForm').on("submit", onLoginFormSubmission);
$(".help").on("click", onHelpButton);
$("#logout-btn").on("click", onLogout);
$("#requests").on("click", ".remove-button", removeRequest);
$("#oops .close").on("click", function(){
	$("#oops").hide();
});


//go
init();