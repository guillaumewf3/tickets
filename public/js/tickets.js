var socket = io();
var user;

function updateRequests(data){
	var trClass;
	$('#requests tbody').empty();
	for(l in data){
		if (data[l].length > 0){
			for(var i=0;i<data[l].length;i++){
				var req = data[l][i];

				switch(req.level){
					case "urgent":
						trClass = "danger"; break;
					case "asap":
						trClass = "warning"; break;
					case "lazy":
						trClass = "success"; break;
				}

				var reqEl = $("<tr>").attr("id", req.id).addClass(trClass);
				var name = $("<td>").html(req.username);
				var date = $("<td>").html(req.date);
				var level = $("<td>").html(req.level);
				var actionTd = $("<td>");

				//only add button to request author, or to me
				if (req.username == user.username || user.username == "guillaume"){
					var removeButton = $('<button>').html("C'est bon !").attr({
						"data-id": req.id
					}).addClass("btn btn-xs btn-primary remove-button");
					actionTd.append(removeButton);
				}

				reqEl.append(name).append(date).append(level).append(actionTd);

				$('#requests tbody').append(reqEl);
			}
		}
	}
}

function onHelpButton(e){
	socket.emit('help', {
		"user": user,
		"level": $(this).attr("data-level")
	});
}

function onLoginFormSubmission(e){
	e.preventDefault();
	var username = $('#name').val();
	socket.emit('login', username);
}

function completeLogin(data){
	user = data;
	localStorage.setItem('user', JSON.stringify(user));
	onConnect();
}

function onConnect(){
	$("body").addClass("connected");
}

function onLogout(){
	$("body").removeClass("connected");
	localStorage.removeItem('user');
	document.location.reload(true);
}

function retrieveUserFromLocalStorage(){
	userFromLS = JSON.parse(localStorage.getItem('user'));

	if (userFromLS){
		user = userFromLS;
		onConnect();
	}
}

function removeRequest(){
	reqId = $(this).attr("data-id");
	socket.emit('removeRequest', {
		"reqId": reqId,
		"user": user
	});
}

function newRequest(){
	$("#beep")[0].play();
}

function init(){
	retrieveUserFromLocalStorage();
}

socket.on('help', updateRequests);
socket.on('userToken', completeLogin);
socket.on('newRequest', newRequest);

$('#loginForm').on("submit", onLoginFormSubmission);
$(".help").on("click", onHelpButton);
$("#logout-btn").on("click", onLogout);
$("#requests").on("click", ".remove-button", removeRequest);

init();