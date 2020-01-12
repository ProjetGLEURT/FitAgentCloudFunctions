const firebase = require('firebase');


Date.prototype.addDays = function(days) {
    this.setDate( this.getDate()  + days);
    return this;
};


exports.getIntervalPeriod = function(numNextWeek, period)
{
    var today = new Date();
    if(period === "hebdomadaire"){
        var conversionNumWeeks = new Array(6, 0, 1, 2, 3, 4, 5)
        trueNumDay = conversionNumWeeks[today.getDay()]
        begin = new Date();
        end = new Date();
        begin.addDays(-trueNumDay+numNextWeek*7);
        end.addDays(7-trueNumDay+numNextWeek*7);
        end.setHours(1, 0, 0);
        return {begin, end}
    }
    else{
        let nbDaysMonth = new Array(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);
        begin = new Date();
        end = new Date( );
        end.addDays(nbDaysMonth[today.getMonth()]);
        end.addDays( - today.getDate() +1);
        end.setHours(1, 0, 0);
        return {begin, end}
    }
}



/*
Function Organization Calendar
*/
function hasToBeFiltered(elementFreeTimes, millisecondEventDuration)
{
    return ((elementFreeTimes.end-elementFreeTimes.start) < millisecondEventDuration);
}

function filterFreeTimes(freeTimes, eventDuration)
{
    let i = 0
    millisecondEventDuration = eventDuration *60 *1000;
    while(i<freeTimes.length)
    {
        if(hasToBeFiltered(freeTimes[i], millisecondEventDuration)){
            freeTimes.splice(i, 1);
        }
        else{
            i++;
        }
    }
    return freeTimes;
}

function findBetterFreeTime(freeTimesPossible, allEvent)
{
    //maxmin algorithm
    let indiceMaxMin, valMaxMin, valMin,  indiceMin;
    if(allEvent.length === 0){
        console.log("pas d'events encore programmés...")
        return 0
    }
    for(var i=0;i<freeTimesPossible.length;i++)
    {
        valMin = freeTimesPossible[i].end - allEvent[0].start
        for(var j=0;j<allEvent.length;j++)
        {
            if((freeTimesPossible[i].end - allEvent[j].start) < valMin)
            {
                valMin = freeTimesPossible[i].end - allEvent[j].start;
                indiceMin = i;
            }
            if((freeTimesPossible[i].start - allEvent[j].end) < valMin)
            {
                valMin = freeTimesPossible[i].end - allEvent[j].start;
                indiceMin = i;
            }
        }
        if(valMaxMin < valMin)
        {
            valMaxMin = valMin
            indiceMaxMin = iMin
        }
    }
    return indiceMaxMin
}

async function loadAllEvents(usersRef, token)
{
    let promesseRequeteUser = await usersRef.orderByChild('infos/token').equalTo(token).once("value");

    let idUser = Object.keys(promesseRequeteUser.val())[0];
    const myUserRef =  await usersRef.child(idUser).once('value');
    const allActivities = myUserRef.val()['activities'];
    console.log("all activities")
    console.log(allActivities)
    const allEvent = []
    const keysActivity = Object.keys(allActivities)
    for(var i=0;i<allActivities.length;i++)
    {
        const eventsOfActivity = allActivities[keysActivity[i]]['events'];
        let keysEventOfActivity = Object.keys(eventsOfActivity)
        for(var j=0;j<keysEventOfActivity.length;j++)
        {
            const event = allActivities[keysEventOfActivity[j]]['events'];
            allEvent.push({start:Date.parse(event.dateTimeStart), end:Date.parse(event.dateTimeEnd)})
        }
    }
    console.log("allEvent")
    console.log(allEvent)
    return allEvent;
}

async function addEvent(eventToAdd, refActivity, token)
{
    let promesseRequeteUser = await usersRef.orderByChild('infos/token').equalTo(token).once("value");
    refActivity.push(eventToAdd);
    return eventToAdd;
}

async function prepareEvent(bestInterval, eventDuration)
{
    let endTime = await bestInterval.start.setTime(bestInterval.start.getTime() + eventDuration*60*1000)
    console.log("LÀ UNE DATE")
    console.log(bestInterval.start)
    console.log("LÀ UNE DATE")
    console.log(end)
    eventToAdd = {start: bestInterval.start.toISOString(), end: endTime.toISOString()}
    return eventToAdd;
}

exports.addActivityEvents = async function (freeTimes, nbEvent, eventDuration, token, usersRef, period, refActivity)
{
    let freeTimesPossible = filterFreeTimes(freeTimes, eventDuration)
    let j;
    let allEvent = await loadAllEvents(usersRef, token);
    let eventAdded;
    let eventToAdd;
    let indiceBetterFreeTime;
    let listEventToAdd = [];
    for(let i=0;i < nbEvent;i++)
    {
        console.log(allEvent)
        indiceBetterFreeTime = findBetterFreeTime(freeTimesPossible, allEvent)
        console.log("freeTimesPossible")
        console.log(freeTimesPossible)
        eventToAdd = prepareEvent(freeTimesPossible[indiceBetterFreeTime], eventDuration) //return event : {start:event.dateTimeStart, end:event.dateTimeEnd}
        allEvent.push(eventToAdd)
        let start = freeTimesPossible[indiceBetterFreeTime].start
        freeTimesPossible[indiceBetterFreeTime].start = start.setTime(start.getTime() + eventDuration*60*1000 );
        if(hasToBeFiltered(freeTimesPossible[indiceBetterFreeTime], millisecondEventDuration))
        {
            freeTimesPossible.splice(indiceBetterFreeTime, 1);
        }    
        listEventToAdd.push(eventToAdd);
    }
    for(let i=0;i<listEventToAdd.length;i++){

        PromiseArray.push(addEvent(eventToAdd, refActivity, token)); //return event : {start:event.dateTimeStart, end:event.dateTimeEnd}
    }

    await Promise.all(promiseArray)


}