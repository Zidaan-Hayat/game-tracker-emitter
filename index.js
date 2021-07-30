const { EventEmitter } = require("events");
const consola = require("consola");
const { greenBright, redBright } = require("chalk");

const rfuncs = require("./roblox");

function wasAlreadyIngame(previousData, userId) {
	for (const user of previousData) {
		if (user.userId == userId) return true;
	}

	return false;
}

class GameEventsListener extends EventEmitter {
	constructor() {
		super();

		const robloxClass = new rfuncs();

		const allGroups = [ 3403705, 3403719, 3865969, 3527388 ];
		let previousFoundUsers = [];

		const func = async (emitEvent = true, isInitial = false) => {

			if (isInitial) consola.info("STARTING INITIAL CHECK...");

			let allGroupMembers = [];
			for (const groupId of allGroups) {
				const r = await robloxClass.roblox.groupMembers(groupId, false, true);
				if (r) allGroupMembers = allGroupMembers.concat(r);
			}

			const res = await robloxClass.game.usersInGame(allGroupMembers);
			if (typeof res === "string") return console.log(res);

			for (const target of res)
				if (!wasAlreadyIngame(previousFoundUsers, target.userId) && emitEvent)
					this.emit("userJoinedGame", target);

			for (const previousUser of previousFoundUsers) {
				let leftGame = true;

				for (const newFoundUsers of res) {
					if (newFoundUsers.userId == previousUser.userId) {
						leftGame = false;
					}
				}

				if (leftGame && emitEvent)
					this.emit("userLeftGame", previousUser);
			}

			previousFoundUsers = [];
			res.forEach(v => previousFoundUsers.push(v))

			if (isInitial) consola.success("INITIAL CHECK COMPLETE");
		};

		setInterval(func, 3 * 30000); // Every 90 seconds
		func(false, true);
	}	
}

const listener = new GameEventsListener();

const debugMode = false;

listener.on("userJoinedGame", res => {
	debugMode ?
		console.log("Joined", res) :
		console.log(greenBright(`[USER JOINED GAME] ${res.username} (${res.userId}) [${res.serverId}]`));
});

listener.on("userLeftGame", res => {
	debugMode ?
		console.log("Left", res) :
		console.log(redBright(`[USER LEFT GAME] ${res.username} (${res.userId}) [${res.serverId}]`));
});
