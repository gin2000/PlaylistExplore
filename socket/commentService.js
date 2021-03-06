const { userTable, commentTable, songTable, relationTable, songListTable, likeTable, notificationTable } = require('./database');
const socketMap = require('./socketMap');

async function emitLatestComment(socket, listOwnerToken, songIndex, listId) {
    songInfo = {
        token: listOwnerToken,
        songIndex: songIndex,
        listId: listId,
    };
    comments = await songTable.getCommentInfo(songInfo);
    socket.emit('getSongComment', comments);
}

function commentService(socket) {
    socket.on('getSongComment', async (songInfo) => {
        comments = await songTable.getCommentInfo(songInfo);
        socket.emit('getSongComment', comments);
    });

    socket.on('newComment', async (commentInfo) => {
        if (!commentInfo.commentContent) return;

        commentInfo['commentToken'] = socket.handshake.session.token;
        const ret = await commentTable.createComment(commentInfo);
        emitLatestComment(socket, commentInfo.listOwnerToken, commentInfo.songIndex, commentInfo.listId);

        if (commentInfo.listOwnerToken === commentInfo.commentToken) return;

        commentInfo['id'] = ret.insertId;
        const notification = notificationTable.createNotificationObject('comment', commentInfo);
        const ret_ = await notificationTable.insertNotification(notification);

        if (!socketMap.has(commentInfo.listOwnerToken)) return;
        notification['id'] = ret_.insertId;
        const notificationInfo = await notificationTable.formatNotification(notification);
        console.log(notificationInfo);
        const informSocket = socketMap.get(commentInfo.listOwnerToken);
        informSocket.emit('newNotification', notificationInfo);

        if (informSocket.handshake.session.notificationList) {
            informSocket.handshake.session.notificationList.unshift(notificationInfo);
            informSocket.handshake.session.save();
        }
    });

    socket.on('deleteComment', async (commentInfo) => {
        commentTable.deleteComment(commentInfo.commentIndex);
        emitLatestComment(socket, commentInfo.listOwnerToken, commentInfo.songIndex, commentInfo.listId);

        if (commentInfo.listOwnerToken === commentInfo.commentToken) return;
        notificationTable.deleteNotification({
            type: 'comment',
            referenceIndex: commentInfo.commentIndex,
        });
    });
}

module.exports = commentService;
