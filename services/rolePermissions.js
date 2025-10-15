// function getUserRoles(tags) {
//     const userRoles = [];

//     if (tags.badges) {
//         if (tags.badges.broadcaster) userRoles.push({ id: 0, name: "broadcaster" });
//         if (tags.badges.moderator) userRoles.push({ id: 1, name: "mod" });
//         if (tags.badges.vip) userRoles.push({ id: 2, name: "VIP" });
//         if (tags.badges.subscriber) userRoles.push({ id: 3, name: "subscriber" });
//         if (tags.badges["artist-badge"]) userRoles.push({ id: 4, name: "artist" });
//     }

//     if (userRoles.length === 0) {
//         userRoles.push({ id: 5, name: "everyone" });
//     }

//     return {
//         roles: userRoles,
//         roleIds: userRoles.map(role => role.id)
//     };
// }
function getUserRoles(msg) {
    const userRoles = [];

    if (msg.userInfo) {
        if (msg.userInfo.isBroadcaster) userRoles.push({ id: 0, name: "broadcaster" });
        if (msg.userInfo.isMod) userRoles.push({ id: 1, name: "mod" });
        if (msg.userInfo.isVip) userRoles.push({ id: 2, name: "VIP" });
        if (msg.userInfo.isSubscriber) userRoles.push({ id: 3, name: "subscriber" });
        if (msg.userInfo.isArtist) userRoles.push({ id: 4, name: "artist" });
    }

    if (userRoles.length === 0) {
        userRoles.push({ id: 5, name: "everyone" });
    }

    return {
        roles: userRoles,
        roleIds: userRoles.map(role => role.id)
    };
}


function getAllowedRolesForCommand(commandRole) {
  switch (commandRole) {
    case 0: return [0]; // broadcaster only
    case 1: return [0, 1]; // broadcaster + mod
    case 2: return [0, 1, 2]; // broadcaster + mod + VIP
    case 3: return [0, 1, 2, 3]; // +subscriber
    case 4: return [0, 1, 2, 3, 4]; // +artist
    case 5: return [0, 1, 2, 3, 4, 5]; // everyone
    default: return [];
  }
}


module.exports = { getAllowedRolesForCommand,getUserRoles };
