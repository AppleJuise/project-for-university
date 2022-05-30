const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const ytdl = require('ytdl-core')
const mongo = require('mongodb').MongoClient
const PORT = process.env.PORT || 3000;

let connectedUsers = {};

const urlDB = 'mongodb+srv://qwerty:test123@cluster0.efuan.mongodb.net/?retryWrites=true&w=majority'

app.use(express.static(__dirname + '/public'));

io.on('connection', function (socket) {
    console.log('Пользователь присоединился.');
    mongo.connect(urlDB, async (err, client) => {
        if (err) {
            console.log('Connection error: ', err)
            throw err
        }

        const songs = client.db().collection('songs')

        socket.on('disconnect', function () {
            let userData = connectedUsers[socket.id];
            if (typeof userData !== 'undefined') {
                let clientNumbers = -1;
                (Object.values(connectedUsers)).forEach((el) => {
                    if (el.room === userData.room) {
                        clientNumbers++;
                    }
                })
                socket.to(userData.room).emit('clients', { clientNumbers })
                //console.log('disconect ' + clientNumbers)
                socket.leave(connectedUsers[socket.id])
                //console.log('Пользователь вышел.')
                socket.to(userData.room).emit('message', {
                    username: 'Система',
                    text: userData.username + ' вышел!',
                });
                delete connectedUsers[socket.id];
                if (clientNumbers === 0) {
                    songs.deleteMany({ room: userData.room })
                }
            }
        });

        socket.on('add song', (data) => {
            songs.insertOne(data)
            socket.to(data.room).emit('add song other clients', data)
        })

        socket.on('choosing song', (data) => {
            //console.log('choosing song')
            socket.to(connectedUsers[socket.id].room).emit('choosing song1', data)
        })

        socket.on('previous button', (data) => {
            // console.log('previous button')
            socket.to(connectedUsers[socket.id].room).emit('previous button1', data)
        })
        socket.on('pause button', (data) => {
            console.log('SOCKET ON pause button')
            socket.to(connectedUsers[socket.id].room).emit('pause button1', data)
        })
        socket.on('play button', (data) => {
            console.log('SOCKET ON play button')
            socket.to(connectedUsers[socket.id].room).emit('play button1', data)
        })
        socket.on('next button', (data) => {
            // console.log('next button')
            socket.to(connectedUsers[socket.id].room).emit('next button1', data)
        })

        socket.on('slider time', (data) => {
            // console.log('slider time')
            socket.to(connectedUsers[socket.id].room).emit('slider time1', data)
        })

        socket.on('joinRoom', function (req, callback) {
            if (req.room.replace(/\s/g, "").length > 0 && req.username.replace(/\s/g, "").length > 0) {
                let nameTaken = false;

                Object.keys(connectedUsers).forEach(function (socketId) {
                    let userInfo = connectedUsers[socketId];
                    if (userInfo.username.toUpperCase() === req.username.toUpperCase()) {
                        nameTaken = true;
                    }
                });

                if (nameTaken) {
                    callback({
                        nameAvailable: false,
                        error: 'Это имя пользователя уже используется!'
                    });
                } else {
                    connectedUsers[socket.id] = req;
                    socket.join(req.room);
                    let clientNumbers = 0;
                    (Object.values(connectedUsers)).forEach((el) => {
                        if (el.room === req.room) {
                            clientNumbers++;
                        }
                    })
                    socket.to(req.room).emit('message', {
                        username: 'Система',
                        text: req.username + ' присоединился!',
                    });
                    songs.find({ "room": req.room }).toArray((err, result) => {
                        if (err) return console.log(err)

                        if (result) {
                            io.to(socket.id).emit('songs', Object.assign({}, result))
                        }
                    })
                    io.in(req.room).emit('clients', { clientNumbers })
                    //console.log('join ' + clientNumbers)
                    callback({
                        nameAvailable: true
                    });
                }
            } else {
                callback({
                    nameAvailable: false,
                    error: 'Заполните форму!'
                });
            }
        });

        socket.on('message', function (message) {
            io.in(connectedUsers[socket.id].room).emit('message', message);
        });


    })

});



const getInfo = async (req, res) => {

    try {
        const { url } = req.query
        const videoId = ytdl.getURLVideoID(url)

        const videoInfo = await ytdl.getInfo(videoId)
        const { thumbnails, author, title } = videoInfo.videoDetails

        return res.status(200).json({
            success: true,
            data: {
                thumbnail: thumbnails[0].url || null,
                videoId, author: author ? author['name'] : null, title
            }
        })

    } catch (error) {
        console.log(`error --->`, error);
        return res.status(500).json({ success: false, msg: "Failed to get video info" })
    }

}


const getAudioStream = async (req, res) => {

    try {

        const { videoId } = req.params
        const isValid = ytdl.validateID(videoId)

        if (!isValid) {

            throw new Error()
        }

        const videoInfo = await ytdl.getInfo(videoId)

        let audioFormat = ytdl.chooseFormat(videoInfo.formats, {
            filter: "audioonly",
            quality: "highestaudio"
        });

        const { itag, container, contentLength } = audioFormat

        const rangeHeader = req.headers.range || null

        //console.log(`rangeHeader -->`, rangeHeader);
        const rangePosition = (rangeHeader) ? rangeHeader.replace(/bytes=/, "").split("-") : null
        //console.log(`rangePosition`, rangePosition);
        const startRange = rangePosition ? parseInt(rangePosition[0], 10) : 0;
        const endRange = rangePosition && rangePosition[1].length > 0 ? parseInt(rangePosition[1], 10) : contentLength - 1;
        const chunksize = (endRange - startRange) + 1;

        res.writeHead(206, {
            'Content-Type': `audio/${container}`,
            'Content-Length': chunksize,
            "Content-Range": "bytes " + startRange + "-" + endRange + "/" + contentLength,
            "Accept-Ranges": "bytes",
        })

        const range = { start: startRange, end: endRange }
        const audioStream = ytdl(videoId, { filter: format => format.itag === itag, range })
        audioStream.pipe(res)

    } catch (error) {
        console.log(error);
        return res.status(500).send()
    }
}


app.get("/info", getInfo)
app.get("/stream/:videoId", getAudioStream)

http.listen(PORT, function () {
    console.log('Server started on port ' + PORT);
});