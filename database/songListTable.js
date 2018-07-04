const db = require("./DB");
const mysql = require("mysql");
const songTable = require('./songTable')
const userTable = require('./userTable')
const { map } = require('p-iteration');
const path = require('path');
const fs = require('fs');
/*
    PRIMARY KEY
    token
    listID

    name
    des
    date
*/

function applyQuery(query) {
    db.query(query, (error, result) => {
        if (error) {
            console.log(error);
            return;
        }
        console.log(result);
    })
}

function getData(query) {
    return new Promise((resolve, reject) => {
        try {
            //console.log(query);
            db.query(query, (error, result) => {
                resolve(result);
            })
        } catch (error) {
            console.log(error);
        }
    })
}

async function addCoverImage(imgData, path){
    fs.writeFile(path, imgData, ()=>{
        console.log("write successfully");
    })
}

function createPlayList(playListInfo) {
    let path = __dirname + "../public/img/" + playListInfo.token + '/' + playListInfo.uploadCover.name;
    console.log(path);
    let sql = "INSERT INTO songList SET ?";
    let insertObject = {
        token: playListInfo.token,
        listId: playListInfo.listId,
        name: playListInfo.name,
        des: playListInfo.des,
        date: playListInfo.date,
        cover: path,
    }

    let query = mysql.format(sql, insertObject);
    addCoverImage(playListInfo.uploadCover, path);
    applyQuery(query);

    /* add song to database */
    playListInfo.songList.map((element, index) => {
        element['songIndex'] = index;
        songTable.createSong(insertObject, element);
    })
}

function deletePlayList(token, listId) {
    let sql = "DELETE FROM songList WHERE ?? = ? AND ?? = ?";
    let condition = [
        'token', token,
        'listId', listId,
    ]
    let query = mysql.format(sql, condition);
    console.log(query);
    applyQuery(query);

    /* delete song in database */
    songTable.deleteSongInList(playListInfo);
}

async function modifyPlayList(playListInfo) {
    await deletePlayList(playListInfo.token, playListInfo.listId);
    createPlayList(playListInfo);
}

async function getSongArrayInfo(playListInfo) {
    sql = 'SELECT * FROM song WHERE token = ?';
    insert = [playListInfo.token];
    query = mysql.format(sql, insert);
    return await getData(query);

}

async function getCompletePlayList(songListResult, needComment) {
    let songList = [];
    await map(songListResult, async (element) => {
        //console.log(element);
        let commentResult = [];
        if(needComment){
            commentResult = await songTable.getCommentInfo(element);
        }

        songList[element.songIndex] = {
            url: element.url,
            songName: element.songName,
            cover: element.cover,
            des: element.des,
            like: element.likeNum,
            comments: commentResult,
        };
        //console.log(songList);
    })
    return songList;
}

async function getCompletePlayListInfo(playListInfo, needComment) {

    let playListMeta = await getPlayList(playListInfo);
    songListResult = await getSongArrayInfo(playListInfo);
    let songList = await getCompletePlayList(songListResult, needComment);
    let userInfo = await userTable.getUserInfo(playListInfo.token);
    let completePlayListInfo = {
        userName: userInfo.userName,
        avatar: userInfo.avatar,
        bio: userInfo.bio,
        playlistInfo: {
            songList: songList,
            name: playListMeta.name,
            des: playListMeta.des,
            date: playListMeta.date,
            token: playListInfo.token,
            listId: playListInfo.listId,
            uploadCover: playListMeta.cover,
        }
    };
    //console.log(completePlayListInfo);
    return completePlayListInfo;
}

async function getPlayList(playListInfo) {
    sql = 'SELECT * FROM songList WHERE token = ?';
    insert = [playListInfo.token];
    query = mysql.format(sql, insert);
    result = await getData(query);
    return result[0];
}

playListInfo = {
    token: '2159235527438018',
    listId: 1
}

async function getPageInfo(latestPlayListInfo){
    pageInfo = [];
    await map(latestPlayListInfo, async (playlistInfo, index) => {
        pageInfo[index] = await getCompletePlayListInfo(playlistInfo, false);
        console.log(index);
        console.log(pageInfo[index]);
    })
    console.log("ret");
    console.log(pageInfo);
    return pageInfo;
}

async function getLatestPlaylists(){
    sql = 'SELECT * FROM songList ORDER BY date DESC LIMIT 5';
    query = mysql.format(sql);
    latestPlayListInfo = await getData(query);
    pageInfo = await getPageInfo(latestPlayListInfo);
    console.log("Page Info");
    console.log(pageInfo);
    return pageInfo;
}



/* test
    getCompletePlayListInfo(playListInfo);
    getLatestPlaylists();

*/

module.exports = {
    createPlayList: createPlayList,
    deletePlayList: deletePlayList,
    modifyPlayList: modifyPlayList,
    getCompletePlayListInfo: getCompletePlayListInfo,
    getLatestPlaylists: getLatestPlaylists
}
