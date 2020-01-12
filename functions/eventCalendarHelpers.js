const {getFreeTimesFromGoogleCalendar} = require('./googleCalendarHelpers');

const firebase = require('firebase');


Date.prototype.addDays = function(days) {
    this.setDate( this.getDate()  + days);
    return this;
};


function getIntervalPeriod(numNextWeek, period)
{
    var today = new Date();
    if(period == "week"){
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
        if((hasToBeFiltered(freeTimes[i], millisecondEventDuration)){
            freeTimes.splice(i, 1);
        }
        else{
            i++;
        }
}

async function findBetterFreeTime(freeTimesPossible, allEvent)
{
    //maxmin algorithm
    let indiceMaxMin, valueMax, valMin,  indiceMin;
    for(var i=0;i<freeTimesPossible.length;i++)
    {
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
        if(valMax < valMin)
        {
            valMax = valMin
            iMax = iMin
        }
    }
    return iMax
}

async function loadAllEvents(usersRef)
{
    let promesseRequeteUser = await usersRef.orderByChild('infos/token').equalTo(token).once("value");

    let idUser = Object.keys(promesseRequeteUser.val())[0];
    const myUserRef = usersRef.child(idUser);
    const myUserActsRef = myUserRef.child('activity');
    const allActivities = myUserActsRef.val();
    const allEvent = []
    const keysActivity = Object.keys(allActivities.val())
    for(var i=0;i<allActivities.length;i++)
    {
        const eventsOfActivity = allActivities[keysActivity[i]].child('events').val();
        let keysEventOfActivity = Object.keys(eventsOfActivity)
        for(var j=0;j<keysEventOfActivity.length;j++)
        {
            const event = allActivities[keysEventOfActivity[j]].child('events').val();
            allEvent.push({start:Date.parse(event.dateTimeStart), end:Date.parse((event.dateTimeEnd)})
        }
    }
    return allEvent;
}

async function addEvent(bestInterval, usersRef, token, eventDuration)
{
    let promesseRequeteUser = await usersRef.orderByChild('infos/token').equalTo(token).once("value");

    let idUser = Object.keys(promesseRequeteUser.val())[0];
    const myUserRef = usersRef.child(idUser);
    const myUserActsRef = myUserRef.child('activity');
    const myUserEventsRef = myUserActsRef.child('events');
    let endTime = setTime(bestInterval.start.getTime() + eventDuration*60*1000)
    eventToAdd = {start: bestInterval.start.toISOString(), end: endTime.toISOString()}
    myUserEventsRef.push(eventToAdd);

}

async function addActivityEvents(idActivity, nbEvent, eventDuration, token, usersRef, period)
{
    let time = getIntervalPeriod(1, period)
    let freeTimes = await getFreeTimesFromGoogleCalendar(token, time.begin, time.end)
    let freeTimesPossible = filterFreeTimes(freeTimes, eventDuration)
    let j;
    let allEvent = loadAllEvents(usersRef);
    let eventAdded;
    for(var i=0;i < nbEvent;i++)
    {
        j=0
        while(j<freeTimesPossible.length)
        {
            indiceBetterFreeTime = await findBetterFreeTime(freeTimesPossible, allEvent)
            eventToAdd = await addEvent(freeTimesPossible[indiceBetterFreeTime], usersRef, token, eventDuration) //return event : {start:event.dateTimeStart, end:event.dateTimeEnd}
            allEvent.push(eventToAdd)
            let start = freeTimesPossible[j].start
            freeTimesPossible[j].start = start.setTime(start.getTime() + eventDuration*60*1000 );
            if(hasToBeFiltered(freeTimesPossible[j], millisecondEventDuration))
            {
                freeTimesPossible.splice(j, 1);
            }
            else{
                j++
            }
        }
    }
}
