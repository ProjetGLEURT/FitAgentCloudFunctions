exports.getNumContext = function  (agent,name) {
    let numContexte = 0
    for(let i = 0; i < agent.contexts.length;i++){
        console.log(agent.contexts[i]);
        if(agent.contexts[i].name === name){
            numContexte = i;
            return numContexte
        }
    }
    return numContexte
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
