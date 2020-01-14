const keyApiGoogle = require("../keyApiGoogle.json");

const googleMapsClient = require('@google/maps').createClient({
    key: keyApiGoogle,
    Promise: Promise,
});

let getNumContext = function  (agent,name) {
    let numContext = 0
    for(let i = 0; i < agent.contexts.length;i++){
        if(agent.contexts[i].name === name){
            numContext = i;
            return numContext
        }
    }
    return numContext
}

exports.getContextParameters = function (agent, name) {
    return agent.contexts[getNumContext(agent,name)].parameters
}


exports.getTokenFromContext = function (agent) {
    let numContext = getNumContext(agent, 'test11');
    let contextParameters = agent.contexts[numContext].parameters;
    if (contextParameters !== undefined && contextParameters.token !== undefined) {
        return contextParameters.token
    }
    return ''
}

exports.computeSeanceDuration = function (contextParameters) {
    let durationUnit = contextParameters.duration.unit;
    let durationAmount = contextParameters.duration.amount;
    if (durationUnit === "heure")
        return (durationAmount * 60);
    if (durationUnit === "seconde")
        return (durationAmount - durationAmount % 60);
    return durationAmount;
}

exports.searchLocationSport = async function (address, sport) {
    var reqGeoLoc = {
        address: address,
        language: "french"
    };
    try {
        let resGeoLoc = await googleMapsClient.geocode(reqGeoLoc).asPromise();
        let response = {};
        let gpsHomePosition = resGeoLoc.json.results[0].geometry.location
        response['myGpsLocation'] = gpsHomePosition;
        let req = {
            location: gpsHomePosition,
            keyword: sport,
            rankby: "distance"
        };
        let res = await googleMapsClient.placesNearby(req).asPromise();
        let firstResult = res.json.results[0]
        let origToDest = {
            origins: req.location,
            destinations: firstResult.geometry.location
        }
        response['sportGpsDest'] = firstResult.geometry.location;
        let resDist = await googleMapsClient.distanceMatrix(origToDest).asPromise();
        response['nameLocationSport'] = firstResult.name;
        response['address'] = firstResult.vicinity;
        response['distanceInKm'] = (resDist.json.rows[0].elements[0].distance.value / 1000).toFixed(1);
        response['timeInMinutes'] = Math.round(resDist.json.rows[0].elements[0].duration.value / 60);
        return response;
    } catch (err) {
        console.log(err)
        throw (JSON.stringify(err, null, 4));
    }
}