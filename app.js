const express = require('express')
const app = express()

var _userConnections = [];
var adminArr = [];
//routes
app.get('/', (req, res) => {
    res.render('index')
})

//Listen on port 3000
server = app.listen(3000)

//socket.io instantiation
const io = require("socket.io")(server)

//listen on every connection
io.on('connection', (socket) => {

    console.log(socket.id);

    socket.on('userconnect', (data) => {
        console.log('userconnect', data.dsiplayName, data.meetingid);

        var other_users = _userConnections.filter(p => p.meeting_id == data.meetingid);
        if(other_users.length == 0){
            adminArr.push({
                connectionId: socket.id,
                user_id: data.dsiplayName,
                meeting_id: data.meetingid
            })
        }
        _userConnections.push({
            connectionId: socket.id,
            user_id: data.dsiplayName,
            meeting_id: data.meetingid
        });

        other_users.forEach(v => {
            socket.to(v.connectionId).emit('informAboutNewConnection', { other_user_id: data.dsiplayName, connId: socket.id });
        });
        // console.log('otherusers', other_users);
        // console.log('Admins', adminArr);

        socket.emit('userconnected', other_users);
        //return other_users;
    });//end of userconnect

    socket.on('exchangeSDP', (data) => {

        socket.to(data.to_connid).emit('exchangeSDP', { message: data.message, from_connid: socket.id });

    });//end of exchangeSDP

    socket.on('reset', (data) => {
        var userObj = _userConnections.find(p => p.connectionId == socket.id);
        if (userObj) {
            var meetingid = userObj.meeting_id;
            var list = _userConnections.filter(p => p.meeting_id == meetingid);
            _userConnections = _userConnections.filter(p => p.meeting_id != meetingid);

            list.forEach(v => {
                socket.to(v.connectionId).emit('reset');
            });

            socket.emit('reset');
        }

    });//end of reset

    socket.on('sendMessage', (msg) => {
        console.log(msg);
        var userObj = _userConnections.find(p => p.connectionId == socket.id);
        if (userObj) {

            var meetingid = userObj.meeting_id;
            var from = userObj.user_id;

            var list = _userConnections.filter(p => p.meeting_id == meetingid);
            console.log(list)

            list.forEach(v => {
                socket.to(v.connectionId).emit('showChatMessage', { from: from, message: msg, time: getCurrDateTime() });
            });

            socket.emit('showChatMessage', { from: from, message: msg, time: getCurrDateTime() });
        }

    });//end of reset

    socket.on('disconnect', function () {
        console.log('Got disconnect!');

        var userObj = _userConnections.find(p => p.connectionId == socket.id);
        if (userObj) {
            var meetingid = userObj.meeting_id;

            _userConnections = _userConnections.filter(p => p.connectionId != socket.id);
            var list = _userConnections.filter(p => p.meeting_id == meetingid);

            list.forEach(v => {
                socket.to(v.connectionId).emit('informAboutConnectionEnd', socket.id);
            });
        }
    });
    socket.on('seek', function (data) {

        var currTime = data.currentTime;
        //console.log(currTime + "play other" + data.connId);
        var admin = adminArr.find(p => p.connectionId == data.connId);
        if(admin){
            var list = _userConnections.filter(p => p.meeting_id == admin.meeting_id);

            // console.log(list);
            list.forEach(v => {
                socket.to(v.connectionId).emit('seekAll', currTime);
            });

         }
    });
    socket.on('play others', function (data) {

        var currTime = data.currentTime;
        //console.log(currTime + "play other" + data.connId);
        var admin = adminArr.find(p => p.connectionId == data.connId);
        if(admin){
            var list = _userConnections.filter(p => p.meeting_id == admin.meeting_id);

            // console.log(list);
            list.forEach(v => {
                socket.to(v.connectionId).emit('playAll', currTime);
            });

         }
    });
    socket.on('pause others', function (data) {
        var currTime = data.currentTime;

        // console.log(data + "pause other");
        
        var admin = adminArr.find(p => p.connectionId == data.connId);

         if(admin){
            var list = _userConnections.filter(p => p.meeting_id == admin.meeting_id);

            // console.log(list);
            list.forEach(v => {
                socket.to(v.connectionId).emit('pauseAll', currTime);
            });

         }
    });
    socket.on('newVideoId', function(data){

        var admin = adminArr.find(p => p.connectionId == data.connId);

         if(admin){
            var list = _userConnections.filter(p => p.meeting_id == admin.meeting_id);

            // console.log(list);
            list.forEach(v => {
                socket.to(v.connectionId).emit('playNewVid', data.videoId);
            });
            socket.emit('playNewVid', data.videoId);
         }else{
             socket.emit('Not Allowed');
         }
    });

})

function getCurrDateTime() {
    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    let seconds = date_ob.getSeconds();
    var dt = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
    return dt;
}
