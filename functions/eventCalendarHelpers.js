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

function dateFormatForApi(date)
{
    let stringConversionMonth = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
    let stringConversionDay = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
    '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31']
    let chaineDate = date.getFullYear() + '-' + stringConversionMonth[date.getMonth()] + '-' + stringConversionDay[date.getDate()-1] + ' 13:00:00';
    
    return chaineDate;
}

function findBetterFreeTime(freeTimesPossible, allEvent, meteoJson)
{
    //maxmin algorithm
    let valMaxMin, valMin;
    let indiceMaxMin = 0
    let diff1, diff2;
    let coeffPluie=1;
    if(allEvent.length === 0){
        console.log("pas d'events encore programmés...")
        return 0
    }
    for(var i=0;i<freeTimesPossible.length;i++)
    {
        valMin = Math.abs(Date.parse(freeTimesPossible[i].end) - Date.parse(allEvent[0].start))
    /*    console.log("valMin")
        console.log(valMin)*/


        if(meteoJson[dateFormatForApi(freeTimesPossible[i].start)] !== undefined)
        {
            console.log("ON A LA METEO")
            if(meteoJson[dateFormatForApi(freeTimesPossible[i].start)].pluie > 0 )
            {
                console.log("ALERTE IL VA PLEUVOIR !!!!")
                coeffPluie = 0.6;
            }
        }
        else{
            pluie = 1
        }

        for(var j=0;j<allEvent.length;j++)
        {

            diff1 = Math.abs(Date.parse(freeTimesPossible[i].end) - Date.parse(allEvent[j].start)) * coeffPluie;
            diff2 = Math.abs(Date.parse(freeTimesPossible[i].start) - Date.parse(allEvent[j].end)) * coeffPluie;
            if(diff1 <= valMin)
            {
                valMin = diff1;
            }
            if(diff2 <= valMin)
            {
                valMin = diff2;
            }
        }
        if(i===0)
        {
            valMaxMin = valMin
        }
        if(valMaxMin <= valMin)
        {

            valMaxMin = valMin
            indiceMaxMin = i
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
    for(var i=0;i<keysActivity.length;i++)
    {
        let eventsOfActivity = allActivities[keysActivity[i]]['events'];

        if(eventsOfActivity === undefined)
            break;
        let keysEventOfActivity = Object.keys(eventsOfActivity)

        let event
        for(var j=0;j<keysEventOfActivity.length;j++)
        {
            event = eventsOfActivity[keysEventOfActivity[j]];
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

function prepareEvent(bestInterval)
{
    console.log(bestInterval)
    console.log("bestInterval")
    let start = bestInterval.start
    let endTime = bestInterval.end

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
        secure=0
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

exports.addActivityEvents = async function (freeTimes, nbEvent, eventDuration, token, usersRef, refActivity, meteoJson)
{
    let freeTimesPossible = filterFreeTimes(freeTimes, eventDuration)
    let sectionFreeTimesPossible = sectionningFreeTimesPossible(freeTimesPossible, eventDuration)
    let allEvent = await loadAllEvents(usersRef, token);
    console.log("allEvent")
    console.log(allEvent)
    let eventToAdd;
    let indiceBetterFreeTime;
    let listPromesseEventToAdd = [];
    for(let i=0;i < nbEvent;i++)
    {
        indiceBetterFreeTime = findBetterFreeTime(sectionFreeTimesPossible, allEvent, meteoJson)
        console.log("sectionFreeTimesPossible[indiceBetterFreeTime]")
        console.log(sectionFreeTimesPossible[indiceBetterFreeTime])
        eventToAdd = prepareEvent(sectionFreeTimesPossible[indiceBetterFreeTime]) 
        allEvent.push(eventToAdd)
        
        //sectionFreeTimesPossible.splice(indiceBetterFreeTime, 1);
        listPromesseEventToAdd.push(eventToAdd);
        if(i > sectionFreeTimesPossible.length)
        {
            break;
        }
    }

    mesEvents = await Promise.all(listPromesseEventToAdd)
    listAdded = []
    for(let i=0;i<mesEvents.length;i++){
        listAdded.push(addEvent(mesEvents[i], refActivity, token, usersRef)); 
    }
    await Promise.all(listAdded)
    
}