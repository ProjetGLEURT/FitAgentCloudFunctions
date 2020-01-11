

exports.getNumContext = function  (agent,name) {
     var numContexte = 0
    for(var i = 0; i < agent.contexts.length;i++)
    {
        console.log(agent.contexts[i]);
        if(agent.contexts[i].name === name)
        {
            numContexte = i;
            break;
        }
    }
    return numContexte
}

exports.computeDuration = function (durationUnit, durationAmount) {
    if (durationUnit === "heure")
        return (durationAmount * 60);
    if (durationUnit === "seconde")
        return (durationAmount / 60);
    return durationAmount;
}
