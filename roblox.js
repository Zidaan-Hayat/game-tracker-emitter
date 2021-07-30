const fetch = require("node-fetch").default;
const mfGameId = 979209050;

const ck = "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_695DC2A5E14F1C56F27E17307BEA67C2C0C67FFC9EF4F3CEFB8BCC27B0D4D9CF63DB52155214874C3597574D55CD18B177AE0D9DCDF1D6093E1606F528366FFFA903F04DDB53689E70371D1E5735BE1F97BCD0BAE62F725E79C9899906C1065BD37E43588F039DF2272A08EEDE052E311A6A234680F82A8D3E62228177A0D7AFC635F84B9B27AB2CCD64C95E92AEB61A4468A950EF3D8CF38A1B8CC289E2C512B2F93A5FF1337EC3B93ED4BC11CC44C9A4D36EE02B2510B773D2F39442FC5EFC4CB1E6C06A20AC70E6F6B65C3AD78594355F55EE0322E5046292D9D7B0D755E36449502B970159E3178850C5E9319A8AF888179A6E5647BC814AB2D9643BA144DDA7E24E62ACE07F7CB00B6F1F4551EEDB2F8EDFBDFA87B223666E4D38899393BBF452D6";

const reqOptions = { headers: { Cookie: `.ROBLOSECURITY=${ck}` } };

// Roblox Class
module.exports = class {
    constructor(client) {
        this.client = client;
        this.game = new Game(client);
        this.roblox = new Roblox(client);

        this.game.roblox = this.roblox;
        this.roblox.game = this.game;
    }
};

// Game Class
class Game {
    constructor(client) {
        this.client = client;
    }

    getImgHash(url) {
        return url && url.split("/")[3];
    }

    splitArr(arr, size) {
        return Array(Math.ceil(arr.length / size)).fill().map((_, index) => index * size).map(begin => arr.slice(begin, begin + size));
    }

    async getHashList(idArr) {
        idArr = this.splitArr(idArr, 10);
        const dataObj = {};

        for (const set of idArr) {
            const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?format=Png&size=48x48&userIds=${set.join(",")}`).catch();
            if (!res.ok) continue;

            const json = await res.json();

            for (const user of json.data) {
                const id = user.targetId;
                const hash = this.getImgHash(user.imageUrl);

                if (hash) dataObj[hash.toString()] = id;
            }
        }

        return dataObj;
    }

    async usersInGame(idArr, gameData = undefined, serverId = undefined) {
        const returnData = [];

        gameData = gameData ? gameData : await this.getGameData(mfGameId, serverId);
        
        if (!gameData) return "Unable to fetch game servers data";
        
        const hashList = await this.getHashList(idArr).catch();

        if (!hashList) return "Unable to fetch users hash list";

        for (const [id, data] of Object.entries(gameData)) {
            for (const player of data.Players) {
                if (player in hashList) {
                    const players = data.PlayerCount[0];
                    const max = data.PlayerCount[1];

                    const userId = hashList[player];
                    const info = await this.roblox.info(userId, true).catch();
                    const serverSize = `${players}/${max}`;

                    const small = players < 30;

                    returnData.push({
                        userId: userId,
                        username: info.username,
                        serverSize: serverSize,
                        serverId: id,
                        small: small
                    });
                }
            }
        }

        return returnData;
    }

    async getGameData(placeId = mfGameId, serverId = undefined) {
        const endpoint = `https://www.roblox.com/games/getgameinstancesjson?placeId=${placeId}&startIndex=0`;

        const res = await fetch(endpoint, reqOptions);

        if (!res) return;

        if (res.status != 200) console.log("GAME DATA", res.status, res.statusText)
        if (!res.ok) return console.log(await res.json());

        const json = await res.json();

        const data = {};

        for (const server of json.Collection) {
            if (serverId && server.Guid === serverId) {
                data[server.Guid] = {};
                data[server.Guid].PlayerCount = [server.CurrentPlayers.length, server.Capacity];
                data[server.Guid].Players = [];

                for (const player of server.CurrentPlayers) {
                    const hash = this.getImgHash(player.Thumbnail.Url);
                    if (hash) data[server.Guid].Players.push(hash);
                }

                break;
            } else {
                data[server.Guid] = {};
                data[server.Guid].PlayerCount = [server.CurrentPlayers.length, server.Capacity];
                data[server.Guid].Players = [];

                for (const player of server.CurrentPlayers) {
                    const hash = this.getImgHash(player.Thumbnail.Url);
                    if (hash) data[server.Guid].Players.push(hash);
                }
            }
        }

        return data;
    }

    async servers(placeId = mfGameId, limit = 25) {
        const endpoint = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Asc&limit=${limit}`;
        const json = await fetch(endpoint, reqOptions)
            .then((res) => res.json())
            .catch(() => undefined);
        if (!json) return;
        return json.data;
    }

    async userInGame(userId) {
        const profileImg = await this.roblox.thumbnails([userId], false, true).then((data) => data[0].imageUrl).catch();
        const imgHash = this.getImgHash(profileImg);
        const data = await this.getGameData(mfGameId).catch();
        if (!data) return;

        for (const [server, serverData] of Object.entries(data)) {
            if (!serverData.Players.includes(imgHash)) continue;

            const players = serverData.PlayerCount[0];
            const max = serverData.PlayerCount[1];
            const size = `${players}/${max}`;
            const small = players < 30;
            return {
                profileImg: profileImg,
                serverSize: size,
                serverId: server,
                small: small
            };
        }
    }
}

// User Class
class Roblox {
    constructor(client) {
        this.client = client;
    }

    async info(param, id = false) {
        const endpoint = !id ? `https://api.roblox.com/users/get-by-username?username=${param}` : `https://api.roblox.com/users/${param}`;
        const json = await fetch(endpoint)
            .then((res) => res.json())
            .catch(() => undefined);
        if (!json) return;
        return { username: json.Username, id: json.Id };
    }

    async thumbnails(ids, circular = false, headshot = false) {
        const endpoint = `https://thumbnails.roblox.com/v1/users/avatar${headshot ? "-headshot" : ""}?userIds=${ids.join(",")}&size=180x180&format=Png&isCircular=${circular.toString()}`;
        const json = await fetch(endpoint)
            .then((res) => res.json())
            .catch(() => undefined);
        if (!json) return;
        return json.data;
    }

    async groupMembers(id, count = false, retIdArr = false) {
        if (count) {
            const data = await this.info(id).catch();
            if (!data) return;
            return data.memberCount;
        }

        const endpoint = `https://groups.roblox.com/v1/groups/${id}/users?sortOrder=Asc&limit=100`;
        let json = await fetch(endpoint)
            .then((res) => res.json())
            .catch(() => undefined);
        
        if (!json) return;

        let cursor = json.nextPageCursor;
        let data = json.data;

        if (cursor) {
            while (cursor) {
                json = await fetch(endpoint + `&cursor=${cursor}`)
                    .then((res) => res.json())
                    .catch(() => undefined);
                if (!json) break;
                cursor = json.nextPageCursor;
                data = data.concat(json.data);
            }
        }

        if (!retIdArr) return data;

        const idArr = [];
        for (const entry of data) idArr.push(entry.user.userId);
        return idArr;
    }

}
