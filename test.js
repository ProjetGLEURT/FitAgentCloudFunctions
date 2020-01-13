Date.prototype.addDays = function(days) {
    this.setDate( this.getDate()  + days);
    return this;
  };

function getIntervalPeriod(numNextWeek, period)
{
    var today = new Date();
    var days = new Array('Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'); 
    if(period == "week"){
        var conversionNumWeeks = new Array(6, 0, 1, 2, 3, 4, 5)
        trueNumDay = conversionNumWeeks[today.getDay()]
        start = new Date();
        end = new Date();
        start.addDays(-trueNumDay+numNextWeek*7);
        end.addDays(7-trueNumDay+numNextWeek*7);
        end.setHours(1, 0, 0);
        return {start, end}
    }
    else{
        let nbDaysMonth = new Array(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);
        start = new Date();
        end = new Date( );
        end.addDays(nbDaysMonth[today.getMonth()]);
        end.addDays( - today.getDate() +1);
        end.setHours(1, 0, 0);
        return {start, end}
    }
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






bbb = new Array()
/*bbb.push(getIntervalPeriod(1, "week"))
bbb.push(getIntervalPeriod(2, "week"))
bbb.push(getIntervalPeriod(3, "week"))*/
bbb.push(getIntervalPeriod(3, "month"))

var a = new Date()
console.log('là', a.toISOString())
a.getTime()
a.setTime(a.getTime() + 300*60*1000)
console.log(a)
var b = new Date()
console.log(a-b)
console.log(Date.parse(a))
console.log(a)

let eventDuration = 23*60;


/*console.log(bbb)
Promise.resolve(sectionningF*/
