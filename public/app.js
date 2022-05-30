const socket = io();
const loginForm = document.querySelector('#login-form');
const loginArea = document.querySelector('#login-area');
const msgForm = document.querySelector('#message-form');
const playArea = document.querySelector('#play-area');
const errorMessage = document.querySelector('#error-msg');
const roomTitle = document.querySelector('.room-title')
const joinChat = document.querySelector('#joinChat')
const messages = document.querySelector('#messages')
const sendMessage = document.querySelector('#sendMessage')
const numberClients = document.querySelector("#numberClients")
const audio = document.querySelector('#videoAudio')
const previousSong = document.querySelector('#previousSong')
const nextSong = document.querySelector('#nextSong')
let slider
const songsForPlaylist = []
let currentSongIndex = 0

window.addEventListener('DOMContentLoaded', (event) => {
    //console.log('DOM fully loaded and parsed');
    //console.log("currentSongIndex", currentSongIndex)
    joinChat.addEventListener('click', (e) => {
        if (document.querySelector("#username").value && document.querySelector("#room").value) {
            joinChatFunction()
        }
    })

    document.querySelector("#username").addEventListener('keydown', (e) => {
        if (document.querySelector("#username").value && document.querySelector("#room").value && e.keyCode === 13) {
            e.preventDefault()
            joinChatFunction()
        }
    })

    document.querySelector("#room").addEventListener('keydown', (e) => {
        if (document.querySelector("#username").value && document.querySelector("#room").value && e.keyCode === 13) {
            e.preventDefault()
            joinChatFunction()
        }
    })

    function joinChatFunction() {
        const username = document.querySelector("#username").value
        const room = document.querySelector("#room").value
        socket.on('clients', (data) => {
            //console.log('clientNumbers', data.clientNumbers)
            numberClients.innerHTML = `${data.clientNumbers}`
        });

        socket.on('add song other clients', (data) => {
            const playlist = document.querySelector("#playlist")
            const item = document.createElement('li')
            songsForPlaylist.push({
                videoUrl: data.videoUrl,
                thumbnail: data.thumbnail,
                title: data.title,
                author: data.author,
            })
            const songIndex = songsForPlaylist.length - 1
            //console.log('object',)
            //console.log('СЮДА СМОТРИ', songsForPlaylist.length - 1)
            item.innerHTML = `<div class="playlistSong" title="${songIndex} ${data.videoUrl}" ><div class="playlist-container"><div class="image-container"><img src="${data.thumbnail}" class="playlist-image"></img></div><div class="container-info"><div class="playlist-title">${data.title}</div><div class="playlist-author">${data.author}</div></div></div></div>`
            playlist.appendChild(item)
            playlist.scrollTop = playlist.scrollHeight
        })



        socket.on('songs', (data) => {
            const playlist = document.querySelector("#playlist")
            const songArray = Object.entries(data)

            songArray.forEach(element => {
                //console.log('thumbnail', element[1].thumbnail)
                songsForPlaylist.push({
                    videoUrl: element[1].videoUrl,
                    thumbnail: element[1].thumbnail,
                    title: element[1].title,
                    author: element[1].author,
                })
                const songIndex = songsForPlaylist.length - 1
                //console.log('object',)
                //console.log('СЮДА СМОТРИ', songsForPlaylist.length - 1)
                const item = document.createElement('li')
                item.innerHTML = `<div class="playlistSong" title="${songIndex} ${element[1].videoUrl}" ><div class="playlist-container"><div class="image-container"><img src="${element[1].thumbnail}" class="playlist-image"></img></div><div class="container-info"><div class="playlist-title">${element[1].title}</div><div class="playlist-author">${element[1].author}</div></div></div></div>`
                playlist.appendChild(item)
                playlist.scrollTop = playlist.scrollHeight
            });
        })

        socket.emit('joinRoom', {
            username,
            room
        }, function (data) {
            if (data.nameAvailable) {
                roomTitle.innerHTML = `#${room}`
                playArea.style.display = "block"
                loginArea.style.display = "none"
            } else {
                errorMessage.innerHTML = `${data.error}`
            }
        });
    }

    socket.on('previous button1', function (data) {
        //console.log('previous button', data.currentSongIndex)
        getVideoInfo(songsForPlaylist[data.currentSongIndex].videoUrl)
    });

    socket.on('pause button1', function (data) {
        console.log('SOCKET ON pause button')
        audio.pause()
    });

    socket.on('play button1', function (data) {
        console.log('SOCKET ON play button')
        audio.play()
    });

    socket.on('next button1', function (data) {
        //console.log('next button', data.currentSongIndex)
        getVideoInfo(songsForPlaylist[data.currentSongIndex].videoUrl)
    });

    socket.on('choosing song1', function (data) {
        currentSongIndex = data.currentSongIndex
        //console.log('choosing song', currentSongIndex)
        //console.log('choosing song', data.videoUrl)
        getVideoInfo(data.videoUrl)
    });

    socket.on('slider time1', function (data) {
        //console.log('slider time', data.currentTime)
        audio.currentTime = data.currentTime
    });

    previousSong.addEventListener('click', () => {
        if (currentSongIndex > 0) {
            currentSongIndex--
            socket.emit('previous button', { currentSongIndex })
            getVideoInfo(songsForPlaylist[currentSongIndex].videoUrl)
        }
    })

    audio.addEventListener('pause', () => {
        console.log('PAUSE')
        setTimeout(() => {
            if (audio.paused) { socket.emit('pause button', { flag: false }) }
        }, 300)
    })

    audio.addEventListener('play', () => {
        console.log('PLAY')
        setTimeout(() => {
            if (!audio.paused) { socket.emit('play button', { flag: true }) }
        }, 300)
    })

    nextSong.addEventListener('click', () => {
        if (currentSongIndex < songsForPlaylist.length - 1) {
            currentSongIndex++
            socket.emit('next button', { currentSongIndex })
            getVideoInfo(songsForPlaylist[currentSongIndex].videoUrl)
        }
    })

    audio.addEventListener('ended', () => {
        if (currentSongIndex < songsForPlaylist.length - 1) {
            currentSongIndex++
            getVideoInfo(songsForPlaylist[currentSongIndex].videoUrl)
        }
    })

    audio.addEventListener('loadeddata', () => {
        audio.play()
    })

    audio.addEventListener('timeupdate', () => {
        if (Math.abs(audio.currentTime - slider) > 0.5) {
            //console.log('WOOPS')
            socket.emit('slider time', { currentTime: audio.currentTime })
        }
        //console.log('audio.currentTime', audio.currentTime)
        slider = audio.currentTime
    });

    socket.on('message', function (message) {
        const item = document.createElement('li')
        if (message.username === 'Система') {
            item.innerHTML = `<span style="font-weight:800">${message.username}</span>: ${message.text}`
        }
        else {
            item.innerHTML = `<span style="font-weight:bold">${message.username}</span>: ${message.text}`
        }
        messages.appendChild(item)
        messages.scrollTop = messages.scrollHeight
    });


    sendMessage.addEventListener('click', (e) => {
        sendMessageFunction()
    })

    document.querySelector("#message").addEventListener('keydown', (e) => {
        if (e.keyCode === 13) {
            e.preventDefault()
            sendMessageFunction()
        }

    })

    function sendMessageFunction() {
        const message = document.querySelector("#message")
        const username = document.querySelector("#username").value
        if (message.value) {
            socket.emit('message', {
                username,
                text: message.value
            })
        }
        message.value = ''
    }


    document.querySelector("#playlist").addEventListener('click', (e) => {
        const nearTag = e.target.closest('.playlistSong')
        //console.log('nearTag.title', nearTag.title)
        const indexAndUrl = nearTag.title.split(' ')

        currentSongIndex = indexAndUrl[0]
        socket.emit('choosing song', { videoUrl: indexAndUrl[1], currentSongIndex })
        getVideoInfo(indexAndUrl[1])
    });

    function getInfoFunction() {
        try {

            const videoUrl = document.querySelector("#videoUrl").value

            if (videoUrl.length <= 0) {
                alert("Please enter a valid url")
                return;
            }

            fetch(`/info?url=${videoUrl}`)
                .then(x => x.json())
                .then(data => {
                    if (data.success) {
                        const playlist = document.querySelector("#playlist")
                        const infoMusic = data.data
                        const thumbnail = infoMusic.thumbnail.split("?")[0]

                        songsForPlaylist.push({
                            videoUrl,
                            thumbnail,
                            title: infoMusic.title,
                            author: infoMusic.author,
                        })
                        const songIndex = songsForPlaylist.length - 1
                        //console.log('object',)
                        //console.log('СЮДА СМОТРИ', songsForPlaylist.length - 1)

                        const item = document.createElement('li')
                        item.innerHTML = `<div class="playlistSong" title="${songIndex} ${videoUrl}" ><div class="playlist-container"><div class="image-container"><img src="${thumbnail}" class="playlist-image"></img></div><div class="container-info"><div class="playlist-title">${infoMusic.title}</div><div class="playlist-author">${infoMusic.author}</div></div></div></div>`
                        playlist.appendChild(item)
                        playlist.scrollTop = playlist.scrollHeight
                        socket.emit('add song', {
                            videoUrl,
                            thumbnail,
                            title: infoMusic.title,
                            author: infoMusic.author,
                            room: document.querySelector("#room").value
                        })

                    } else {
                        throw new Error()
                    }
                })

        } catch (error) {
            console.log(`err: `, error);
            alert(`Failed to get video info`)
        }
        document.querySelector("#videoUrl").value = ''
    }

    document.querySelector("#getInfoBtn").addEventListener('click', (e) => {
        getInfoFunction()
    })

    document.querySelector("#videoUrl").addEventListener('keydown', (e) => {

        if (e.keyCode === 13) {
            e.preventDefault()
            getInfoFunction()
        }
    })

    function initializePlayer(videoInfo) {
        const thumbnail = videoInfo.thumbnail.split("?")[0]
        document.querySelector("#videoThumbnail").src = thumbnail
        document.querySelector("#videoAudio").src = '/stream/' + videoInfo.videoId
        document.querySelector("#videoTitle").textContent = videoInfo.title
        document.querySelector("#videoAuthor").textContent = videoInfo.author


        if ('mediaSession' in navigator) {

            navigator.mediaSession.metadata = new window.MediaMetadata({
                title: videoInfo.title,
                artist: videoInfo.author,
                artwork: [
                    {
                        src: thumbnail,
                        sizes: '480x360', // HeightxWidth
                        type: 'image/png'
                    }
                ]
            });
        }
    }

    function getVideoInfo(url) {
        try {

            if (url.length <= 0) {
                alert("Please enter a valid url")
                return;
            }

            fetch(`/info?url=${url}`)
                .then(x => x.json())
                .then(data => {
                    if (data.success) {
                        initializePlayer(data.data)
                    } else {
                        throw new Error()
                    }
                })

        } catch (error) {
            console.log(`errpr -==>`, error);
            alert(`Failed to get video info`)
        }
    }
});