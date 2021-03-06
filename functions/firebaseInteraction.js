
exports.initializeFirebaseUser = function (token, userEmail, usersRef, response) {
    let data = {
        infos:
        {
            name: userEmail,
            minSportBeginTime: '8',
            maxSportEndTime: '22',
            email: userEmail,
            address: "",
            token: token,
        },
        activities: {}
    };
    usersRef.push(data);
    response.send(data)
};


exports.refreshTokenInFirebase = async function (token, usersRef, promesseRequeteUser, response ) { //deprecated

    let idUser = Object.keys(promesseRequeteUser.val())[0];
    const myUserRef = usersRef.child(idUser);
    const myUserInfosRef = myUserRef.child('infos');
    let data = {
        token: token,
    };
    myUserInfosRef.update(data);
    response.send(await myUserRef.once("value"))
};


exports.updateAddressInFirebase = function (requestHeader, usersRef, promesseRequeteUser, response) {
    let idUser = Object.keys(promesseRequeteUser.val())[0];
    const myUserRef = usersRef.child(idUser);
    const myUserInfosRef = myUserRef.child('infos');
    console.log("User info : ", JSON.stringify(myUserInfosRef, null, 4))
    console.log("header : ", requestHeader)
    console.log(requestHeader.address)

    let data = {
        address: requestHeader.address,
        // requestheader.address === undefined ? address : userAddressInUrl, : stop = true;
        minSportBeginTime: requestHeader.minsportbegintime,
        maxSportEndTime: requestHeader.maxsportendtime,
    };
    myUserInfosRef.update(data);
    response.send("Address updated")
}

exports.deleteActivityInFirebase = function (acitivityIdToDelete, usersRef, promesseRequeteUser, response) {
    let idUser = Object.keys(promesseRequeteUser.val())[0];
    const myUserRef = usersRef.child(idUser);
    const myUserActsRef = myUserRef.child('activities');
    myUserActsRef.child(acitivityIdToDelete).remove();
    response.send("Activity delete")
}