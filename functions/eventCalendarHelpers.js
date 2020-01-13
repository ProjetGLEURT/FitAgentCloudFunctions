const firebase = require('firebase');
const functions = require('firebase-functions');


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
    let valMaxMin, valMin, indiceMin;
    let indiceMaxMin = 0
    if(allEvent.length === 0){
        console.log("pas d'events encore programmés...")
        return 0
    }

    valMaxMin = freeTimesPossible[0].end - allEvent[0].start
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
        if(valMaxMin <= valMin)
        {
            valMaxMin = valMin
            indiceMaxMin = indiceMin
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
    return allEvent;
}

    async function addEvent(eventToAdd, refActivity, token, usersRef)
    {
        refActivity.child('events').push({dateTimeStart:eventToAdd.start, dateTimeEnd:eventToAdd.end});
        return eventToAdd;
    }

async function prepareEvent(bestInterval, eventDuration)
{
    let start = bestInterval.start
    let endTime = bestInterval.start
    await endTime.setTime(bestInterval.start.getTime() + eventDuration*60*1000)

    eventToAdd = {start: start.toISOString(), end: endTime.toISOString()}
    return eventToAdd;
}


function sectionningFreeTimesPossible(freeTimesPossible, eventDuration)
{
    var sectionFreeTimesPossible = []
    var possibleSectionning;
    var secure=0;
    var initEnd

    for(let i=0;i<freeTimesPossible.length;i++)
    {
        possibleSectionning = true
        initEnd = new Date(freeTimesPossible[i].end)
        while(possibleSectionning && secure < 10)
        {
            let start = new Date(freeTimesPossible[i].start)
            let end = new Date(freeTimesPossible[i].end)
            let potentialNewEnd =new Date(start)
            potentialNewEnd.setTime(start.getTime() + eventDuration*60*1000)
            sectionFreeTimesPossible.push({start:start, end:potentialNewEnd})
            if((initEnd - potentialNewEnd)< 0)
            {
                possibleSectionning = false
            }
            else
            {
                freeTimesPossible[i].start = new Date(potentialNewEnd)
            }
            secure++;

        }
    }

    return sectionFreeTimesPossible
}

exports.addActivityEvents = async function (freeTimes, nbEvent, eventDuration, token, usersRef, refActivity)
{
    let freeTimesPossible = filterFreeTimes(freeTimes, eventDuration)
    let sectionFreeTimesPossible = sectionningFreeTimesPossible(freeTimesPossible, eventDuration)
    let allEvent = await loadAllEvents(usersRef, token);
    let eventToAdd;
    let indiceBetterFreeTime;
    let listPromesseEventToAdd = [];
    for(let i=0;i < nbEvent;i++)
    {
        indiceBetterFreeTime = findBetterFreeTime(freeTimesPossible, allEvent)
        eventToAdd = prepareEvent(sectionFreeTimesPossible[indiceBetterFreeTime], eventDuration) 
        allEvent.push(eventToAdd)
        
        sectionFreeTimesPossible.splice(indiceBetterFreeTime, 1);
        listPromesseEventToAdd.push(eventToAdd);
    }

    mesEvents = await Promise.all(listPromesseEventToAdd)
    listAdded = []
    for(let i=0;i<mesEvents.length;i++){
        listAdded.push(addEvent(mesEvents[i], refActivity, token, usersRef)); 
    }
    await Promise.all(listAdded)
    
}