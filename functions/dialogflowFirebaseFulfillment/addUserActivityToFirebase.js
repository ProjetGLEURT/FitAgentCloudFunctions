let getNumContext = function  (agent,name) {
    let numContext = 0
    for(let i = 0; i < agent.contexts.length;i++){
        if(agent.contexts[i].name === name){
            numContexte = i;
            return numContext
        }
    }
    return numContext
}

exports.getContextParameters = function (agent, name) {
    return agent.contexts[getNumContext(agent,name)].parameters
}

exports.getToken = function (agent) {
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
