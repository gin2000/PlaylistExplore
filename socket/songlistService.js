const { userTable, commentTable, songTable, relationTable, songListTable, likeTable } = require('./database');
const fecha = require('fecha');

let ownerInfoMap = {};

function calculate_song(base, playlistInfo) {
    playlistInfo.forEach((element) => {
        base += element.playlistInfo.songList.length;
    });
    return base;
}

function songlistService(socket) {
    socket.on('publishNewPlaylist', async (playlistInfo) => {
        playlistInfo['token'] = socket.handshake.session.token;
        const insertId = await songListTable.modifyPlayList(playlistInfo);
        socket.emit('publishNewPlaylist', insertId);
    });

    socket.on('getLatestPlaylists', async (date) => {
        //console.log(date.toISOString);
        date = fecha.format(new Date(date), 'YYYY-MM-DD HH:mm:ss');
        console.log(date);
        let latestplaylistInfo = await songListTable.getLatestPlaylists(5, date, socket.handshake.session.token, false);
        socket.emit('getLatestPlaylists', latestplaylistInfo);
    });

    socket.on('getLatestThrity', async (date) => {
        date = fecha.format(new Date(date), 'YYYY-MM-DD HH:mm:ss');
        console.log(date);
        let ret = [];
        let songNum = 0;
        while (songNum < 30) {
            let latestplaylistInfo = await songListTable.getLatestPlaylists(5, date, socket.handshake.session.token, false);
            if (latestplaylistInfo.length == 0) break;
            let last = latestplaylistInfo.length - 1;
            console.log(last);
            date = latestplaylistInfo[last].playlistInfo.date;
            songNum += calculate_song(songNum, latestplaylistInfo);
            latestplaylistInfo.forEach((element) => {
                ret.push(element);
            });
        }
        console.log(songNum);
        console.log(ret);
        socket.emit('getLatestThrity', ret);
    });

    socket.on('getOwnerInfo', async (pageInfo) => {
        const token = pageInfo.listOwnerToken;
        let ownerHistory = await songListTable.getOwnerHistory(token);
        socket.emit('getOwnerHistory', ownerHistory);

        if (ownerHistory.length === 0) {
            const userInfo = await userTable.getUserInfo(token);
            const ret = {
                userName: userInfo.userName,
                avatar: userInfo.avatar,
                bio: userInfo.bio,
                playlistInfo: {
                    songList: [],
                    name: '',
                    des: '',
                    date: '',
                    token: '',
                    listId: '',
                    uploadCover: '',
                },
            };
            socket.emit('getOwnerInfo', ret);
            return;
        }

        let playlistInfo = {
            token: token,
            listId: Number(pageInfo.listId) === -1 ? ownerHistory[0].listId : pageInfo.listId,
        };

        let ownerInfo = await songListTable.getCompleteplaylistInfo(playlistInfo, true);
        socket.emit('getOwnerInfo', ownerInfo);
    });

    socket.on('editPlaylist', (ownerInfo) => {
        const token = ownerInfo.playlistInfo.token;
        ownerInfoMap[token] = ownerInfo;
        socket.emit('redirect', `edit?id=${token}`);
    });

    socket.on('getEditInfo', (token = {}) => {
        console.log(ownerInfoMap[token]);
        socket.emit('getEditInfo', ownerInfoMap[token]);
    });
}

module.exports = songlistService;
